/* Minimal renderer for the page templates: {{holes}}, <sc-for>, <sc-if>, onClick. */
(function () {
  var HOLE = /\{\{\s*([^}]+?)\s*\}\}/g;
  function lookup(scope, path) {
    path = path.trim();
    if (path === 'true') return true;
    if (path === 'false') return false;
    if (/^-?\d+(\.\d+)?$/.test(path)) return Number(path);
    var parts = path.split('.');
    var v = scope;
    for (var i = 0; i < parts.length; i++) {
      if (v == null) return undefined;
      v = v[parts[i]];
    }
    return v;
  }
  function whole(str) {
    var m = /^\s*\{\{\s*([^}]+?)\s*\}\}\s*$/.exec(str);
    return m ? m[1] : null;
  }
  function interp(str, scope) {
    return str.replace(HOLE, function (_, p) {
      var v = lookup(scope, p);
      return v == null ? '' : String(v);
    });
  }
  function build(node, scope, out) {
    if (node.nodeType === 3) {
      var t = node.nodeValue;
      out.push(document.createTextNode(t.indexOf('{{') > -1 ? interp(t, scope) : t));
      return;
    }
    if (node.nodeType !== 1) return;
    var tag = node.localName;
    if (tag === 'sc-for') {
      var list = lookup(scope, whole(node.getAttribute('list')) || '') || [];
      var as = node.getAttribute('as') || 'item';
      list.forEach(function (item, i) {
        var s = Object.create(scope);
        s[as] = item; s.$index = i;
        node.childNodes.forEach(function (c) { build(c, s, out); });
      });
      return;
    }
    if (tag === 'sc-if') {
      var val = lookup(scope, whole(node.getAttribute('value')) || '');
      if (val) node.childNodes.forEach(function (c) { build(c, scope, out); });
      return;
    }
    var el = node.cloneNode(false);
    Array.prototype.slice.call(node.attributes).forEach(function (a) {
      var name = a.name, value = a.value;
      if (name.indexOf('hint-') === 0) { el.removeAttribute(name); return; }
      if (value.indexOf('{{') === -1) return;
      var w = whole(value);
      if (name.slice(0, 2) === 'on' && w) {
        el.removeAttribute(name);
        var fn = lookup(scope, w);
        if (typeof fn === 'function') el.addEventListener(name.slice(2).toLowerCase(), function (e) { e.preventDefault(); fn(e); });
        return;
      }
      var v2 = interp(value, scope);
      if (name === 'src' && /^img\/[0-9a-f]{32}$/.test(v2)) v2 += '.jpg';
      el.setAttribute(name, v2);
    });
    var kids = [];
    node.childNodes.forEach(function (c) { build(c, scope, kids); });
    kids.forEach(function (k) { el.appendChild(k); });
    out.push(el);
  }
  window.DCLogic = function (props) { this.props = props || {}; this.state = {}; };
  window.DCLogic.prototype.setState = function (patch) {
    Object.assign(this.state, typeof patch === 'function' ? patch(this.state) : patch);
    this.__render();
  };
  window.DCLite = {
    mount: function (templateId, rootId, Component) {
      var tpl = document.getElementById(templateId);
      var root = document.getElementById(rootId);
      var c = new Component({});
      c.__render = function () {
        var vals = c.renderVals();
        var out = [];
        tpl.content.childNodes.forEach(function (n) { build(n, vals, out); });
        root.replaceChildren.apply(root, out);
      };
      c.__render();
      if (c.componentDidMount) c.componentDidMount();
    }
  };
})();
