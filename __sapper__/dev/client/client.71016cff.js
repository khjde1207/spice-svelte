function noop() { }
function assign(tar, src) {
    // @ts-ignore
    for (const k in src)
        tar[k] = src[k];
    return tar;
}
function add_location(element, file, line, column, char) {
    element.__svelte_meta = {
        loc: { file, line, column, char }
    };
}
function run(fn) {
    return fn();
}
function blank_object() {
    return Object.create(null);
}
function run_all(fns) {
    fns.forEach(run);
}
function is_function(thing) {
    return typeof thing === 'function';
}
function safe_not_equal(a, b) {
    return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
}
function validate_store(store, name) {
    if (store != null && typeof store.subscribe !== 'function') {
        throw new Error(`'${name}' is not a store with a 'subscribe' method`);
    }
}
function subscribe(store, ...callbacks) {
    if (store == null) {
        return noop;
    }
    const unsub = store.subscribe(...callbacks);
    return unsub.unsubscribe ? () => unsub.unsubscribe() : unsub;
}
function component_subscribe(component, store, callback) {
    component.$$.on_destroy.push(subscribe(store, callback));
}
function create_slot(definition, ctx, $$scope, fn) {
    if (definition) {
        const slot_ctx = get_slot_context(definition, ctx, $$scope, fn);
        return definition[0](slot_ctx);
    }
}
function get_slot_context(definition, ctx, $$scope, fn) {
    return definition[1] && fn
        ? assign($$scope.ctx.slice(), definition[1](fn(ctx)))
        : $$scope.ctx;
}
function get_slot_changes(definition, $$scope, dirty, fn) {
    if (definition[2] && fn) {
        const lets = definition[2](fn(dirty));
        if ($$scope.dirty === undefined) {
            return lets;
        }
        if (typeof lets === 'object') {
            const merged = [];
            const len = Math.max($$scope.dirty.length, lets.length);
            for (let i = 0; i < len; i += 1) {
                merged[i] = $$scope.dirty[i] | lets[i];
            }
            return merged;
        }
        return $$scope.dirty | lets;
    }
    return $$scope.dirty;
}
function update_slot(slot, slot_definition, ctx, $$scope, dirty, get_slot_changes_fn, get_slot_context_fn) {
    const slot_changes = get_slot_changes(slot_definition, $$scope, dirty, get_slot_changes_fn);
    if (slot_changes) {
        const slot_context = get_slot_context(slot_definition, ctx, $$scope, get_slot_context_fn);
        slot.p(slot_context, slot_changes);
    }
}

function append(target, node) {
    target.appendChild(node);
}
function insert(target, node, anchor) {
    target.insertBefore(node, anchor || null);
}
function detach(node) {
    node.parentNode.removeChild(node);
}
function element(name) {
    return document.createElement(name);
}
function svg_element(name) {
    return document.createElementNS('http://www.w3.org/2000/svg', name);
}
function text(data) {
    return document.createTextNode(data);
}
function space() {
    return text(' ');
}
function empty() {
    return text('');
}
function attr(node, attribute, value) {
    if (value == null)
        node.removeAttribute(attribute);
    else if (node.getAttribute(attribute) !== value)
        node.setAttribute(attribute, value);
}
function children(element) {
    return Array.from(element.childNodes);
}
function claim_element(nodes, name, attributes, svg) {
    for (let i = 0; i < nodes.length; i += 1) {
        const node = nodes[i];
        if (node.nodeName === name) {
            let j = 0;
            const remove = [];
            while (j < node.attributes.length) {
                const attribute = node.attributes[j++];
                if (!attributes[attribute.name]) {
                    remove.push(attribute.name);
                }
            }
            for (let k = 0; k < remove.length; k++) {
                node.removeAttribute(remove[k]);
            }
            return nodes.splice(i, 1)[0];
        }
    }
    return svg ? svg_element(name) : element(name);
}
function claim_text(nodes, data) {
    for (let i = 0; i < nodes.length; i += 1) {
        const node = nodes[i];
        if (node.nodeType === 3) {
            node.data = '' + data;
            return nodes.splice(i, 1)[0];
        }
    }
    return text(data);
}
function claim_space(nodes) {
    return claim_text(nodes, ' ');
}
function custom_event(type, detail) {
    const e = document.createEvent('CustomEvent');
    e.initCustomEvent(type, false, false, detail);
    return e;
}
function query_selector_all(selector, parent = document.body) {
    return Array.from(parent.querySelectorAll(selector));
}

let current_component;
function set_current_component(component) {
    current_component = component;
}
function get_current_component() {
    if (!current_component)
        throw new Error(`Function called outside component initialization`);
    return current_component;
}
function onMount(fn) {
    get_current_component().$$.on_mount.push(fn);
}
function afterUpdate(fn) {
    get_current_component().$$.after_update.push(fn);
}
function setContext(key, context) {
    get_current_component().$$.context.set(key, context);
}
function getContext(key) {
    return get_current_component().$$.context.get(key);
}

const dirty_components = [];
const binding_callbacks = [];
const render_callbacks = [];
const flush_callbacks = [];
const resolved_promise = Promise.resolve();
let update_scheduled = false;
function schedule_update() {
    if (!update_scheduled) {
        update_scheduled = true;
        resolved_promise.then(flush);
    }
}
function add_render_callback(fn) {
    render_callbacks.push(fn);
}
let flushing = false;
const seen_callbacks = new Set();
function flush() {
    if (flushing)
        return;
    flushing = true;
    do {
        // first, call beforeUpdate functions
        // and update components
        for (let i = 0; i < dirty_components.length; i += 1) {
            const component = dirty_components[i];
            set_current_component(component);
            update(component.$$);
        }
        dirty_components.length = 0;
        while (binding_callbacks.length)
            binding_callbacks.pop()();
        // then, once components are updated, call
        // afterUpdate functions. This may cause
        // subsequent updates...
        for (let i = 0; i < render_callbacks.length; i += 1) {
            const callback = render_callbacks[i];
            if (!seen_callbacks.has(callback)) {
                // ...so guard against infinite loops
                seen_callbacks.add(callback);
                callback();
            }
        }
        render_callbacks.length = 0;
    } while (dirty_components.length);
    while (flush_callbacks.length) {
        flush_callbacks.pop()();
    }
    update_scheduled = false;
    flushing = false;
    seen_callbacks.clear();
}
function update($$) {
    if ($$.fragment !== null) {
        $$.update();
        run_all($$.before_update);
        const dirty = $$.dirty;
        $$.dirty = [-1];
        $$.fragment && $$.fragment.p($$.ctx, dirty);
        $$.after_update.forEach(add_render_callback);
    }
}
const outroing = new Set();
let outros;
function group_outros() {
    outros = {
        r: 0,
        c: [],
        p: outros // parent group
    };
}
function check_outros() {
    if (!outros.r) {
        run_all(outros.c);
    }
    outros = outros.p;
}
function transition_in(block, local) {
    if (block && block.i) {
        outroing.delete(block);
        block.i(local);
    }
}
function transition_out(block, local, detach, callback) {
    if (block && block.o) {
        if (outroing.has(block))
            return;
        outroing.add(block);
        outros.c.push(() => {
            outroing.delete(block);
            if (callback) {
                if (detach)
                    block.d(1);
                callback();
            }
        });
        block.o(local);
    }
}

const globals = (typeof window !== 'undefined'
    ? window
    : typeof globalThis !== 'undefined'
        ? globalThis
        : global);

function get_spread_update(levels, updates) {
    const update = {};
    const to_null_out = {};
    const accounted_for = { $$scope: 1 };
    let i = levels.length;
    while (i--) {
        const o = levels[i];
        const n = updates[i];
        if (n) {
            for (const key in o) {
                if (!(key in n))
                    to_null_out[key] = 1;
            }
            for (const key in n) {
                if (!accounted_for[key]) {
                    update[key] = n[key];
                    accounted_for[key] = 1;
                }
            }
            levels[i] = n;
        }
        else {
            for (const key in o) {
                accounted_for[key] = 1;
            }
        }
    }
    for (const key in to_null_out) {
        if (!(key in update))
            update[key] = undefined;
    }
    return update;
}
function get_spread_object(spread_props) {
    return typeof spread_props === 'object' && spread_props !== null ? spread_props : {};
}
function create_component(block) {
    block && block.c();
}
function claim_component(block, parent_nodes) {
    block && block.l(parent_nodes);
}
function mount_component(component, target, anchor) {
    const { fragment, on_mount, on_destroy, after_update } = component.$$;
    fragment && fragment.m(target, anchor);
    // onMount happens before the initial afterUpdate
    add_render_callback(() => {
        const new_on_destroy = on_mount.map(run).filter(is_function);
        if (on_destroy) {
            on_destroy.push(...new_on_destroy);
        }
        else {
            // Edge case - component was destroyed immediately,
            // most likely as a result of a binding initialising
            run_all(new_on_destroy);
        }
        component.$$.on_mount = [];
    });
    after_update.forEach(add_render_callback);
}
function destroy_component(component, detaching) {
    const $$ = component.$$;
    if ($$.fragment !== null) {
        run_all($$.on_destroy);
        $$.fragment && $$.fragment.d(detaching);
        // TODO null out other refs, including component.$$ (but need to
        // preserve final state?)
        $$.on_destroy = $$.fragment = null;
        $$.ctx = [];
    }
}
function make_dirty(component, i) {
    if (component.$$.dirty[0] === -1) {
        dirty_components.push(component);
        schedule_update();
        component.$$.dirty.fill(0);
    }
    component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
}
function init(component, options, instance, create_fragment, not_equal, props, dirty = [-1]) {
    const parent_component = current_component;
    set_current_component(component);
    const prop_values = options.props || {};
    const $$ = component.$$ = {
        fragment: null,
        ctx: null,
        // state
        props,
        update: noop,
        not_equal,
        bound: blank_object(),
        // lifecycle
        on_mount: [],
        on_destroy: [],
        before_update: [],
        after_update: [],
        context: new Map(parent_component ? parent_component.$$.context : []),
        // everything else
        callbacks: blank_object(),
        dirty
    };
    let ready = false;
    $$.ctx = instance
        ? instance(component, prop_values, (i, ret, ...rest) => {
            const value = rest.length ? rest[0] : ret;
            if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                if ($$.bound[i])
                    $$.bound[i](value);
                if (ready)
                    make_dirty(component, i);
            }
            return ret;
        })
        : [];
    $$.update();
    ready = true;
    run_all($$.before_update);
    // `false` as a special case of no DOM component
    $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
    if (options.target) {
        if (options.hydrate) {
            const nodes = children(options.target);
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            $$.fragment && $$.fragment.l(nodes);
            nodes.forEach(detach);
        }
        else {
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            $$.fragment && $$.fragment.c();
        }
        if (options.intro)
            transition_in(component.$$.fragment);
        mount_component(component, options.target, options.anchor);
        flush();
    }
    set_current_component(parent_component);
}
class SvelteComponent {
    $destroy() {
        destroy_component(this, 1);
        this.$destroy = noop;
    }
    $on(type, callback) {
        const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
        callbacks.push(callback);
        return () => {
            const index = callbacks.indexOf(callback);
            if (index !== -1)
                callbacks.splice(index, 1);
        };
    }
    $set() {
        // overridden by instance, if it has props
    }
}

function dispatch_dev(type, detail) {
    document.dispatchEvent(custom_event(type, Object.assign({ version: '3.24.0' }, detail)));
}
function append_dev(target, node) {
    dispatch_dev("SvelteDOMInsert", { target, node });
    append(target, node);
}
function insert_dev(target, node, anchor) {
    dispatch_dev("SvelteDOMInsert", { target, node, anchor });
    insert(target, node, anchor);
}
function detach_dev(node) {
    dispatch_dev("SvelteDOMRemove", { node });
    detach(node);
}
function attr_dev(node, attribute, value) {
    attr(node, attribute, value);
    if (value == null)
        dispatch_dev("SvelteDOMRemoveAttribute", { node, attribute });
    else
        dispatch_dev("SvelteDOMSetAttribute", { node, attribute, value });
}
function set_data_dev(text, data) {
    data = '' + data;
    if (text.wholeText === data)
        return;
    dispatch_dev("SvelteDOMSetData", { node: text, data });
    text.data = data;
}
function validate_slots(name, slot, keys) {
    for (const slot_key of Object.keys(slot)) {
        if (!~keys.indexOf(slot_key)) {
            console.warn(`<${name}> received an unexpected slot "${slot_key}".`);
        }
    }
}
class SvelteComponentDev extends SvelteComponent {
    constructor(options) {
        if (!options || (!options.target && !options.$$inline)) {
            throw new Error(`'target' is a required option`);
        }
        super();
    }
    $destroy() {
        super.$destroy();
        this.$destroy = () => {
            console.warn(`Component was already destroyed`); // eslint-disable-line no-console
        };
    }
    $capture_state() { }
    $inject_state() { }
}

const subscriber_queue = [];
/**
 * Create a `Writable` store that allows both updating and reading by subscription.
 * @param {*=}value initial value
 * @param {StartStopNotifier=}start start and stop notifications for subscriptions
 */
function writable(value, start = noop) {
    let stop;
    const subscribers = [];
    function set(new_value) {
        if (safe_not_equal(value, new_value)) {
            value = new_value;
            if (stop) { // store is ready
                const run_queue = !subscriber_queue.length;
                for (let i = 0; i < subscribers.length; i += 1) {
                    const s = subscribers[i];
                    s[1]();
                    subscriber_queue.push(s, value);
                }
                if (run_queue) {
                    for (let i = 0; i < subscriber_queue.length; i += 2) {
                        subscriber_queue[i][0](subscriber_queue[i + 1]);
                    }
                    subscriber_queue.length = 0;
                }
            }
        }
    }
    function update(fn) {
        set(fn(value));
    }
    function subscribe(run, invalidate = noop) {
        const subscriber = [run, invalidate];
        subscribers.push(subscriber);
        if (subscribers.length === 1) {
            stop = start(set) || noop;
        }
        run(value);
        return () => {
            const index = subscribers.indexOf(subscriber);
            if (index !== -1) {
                subscribers.splice(index, 1);
            }
            if (subscribers.length === 0) {
                stop();
                stop = null;
            }
        };
    }
    return { set, update, subscribe };
}

const CONTEXT_KEY = {};

const preload = () => ({});

/* src/components/Nav.svelte generated by Svelte v3.24.0 */

const file = "src/components/Nav.svelte";

function create_fragment(ctx) {
	let nav;
	let ul;

	const block = {
		c: function create() {
			nav = element("nav");
			ul = element("ul");
			this.h();
		},
		l: function claim(nodes) {
			nav = claim_element(nodes, "NAV", { class: true });
			var nav_nodes = children(nav);
			ul = claim_element(nav_nodes, "UL", { class: true });
			var ul_nodes = children(ul);
			ul_nodes.forEach(detach_dev);
			nav_nodes.forEach(detach_dev);
			this.h();
		},
		h: function hydrate() {
			attr_dev(ul, "class", "svelte-1crcd61");
			add_location(ul, file, 51, 1, 646);
			attr_dev(nav, "class", "svelte-1crcd61");
			add_location(nav, file, 50, 0, 639);
		},
		m: function mount(target, anchor) {
			insert_dev(target, nav, anchor);
			append_dev(nav, ul);
		},
		p: noop,
		i: noop,
		o: noop,
		d: function destroy(detaching) {
			if (detaching) detach_dev(nav);
		}
	};

	dispatch_dev("SvelteRegisterBlock", {
		block,
		id: create_fragment.name,
		type: "component",
		source: "",
		ctx
	});

	return block;
}

function instance($$self, $$props) {
	const writable_props = [];

	Object.keys($$props).forEach(key => {
		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Nav> was created with unknown prop '${key}'`);
	});

	let { $$slots = {}, $$scope } = $$props;
	validate_slots("Nav", $$slots, []);
	return [];
}

class Nav extends SvelteComponentDev {
	constructor(options) {
		super(options);
		init(this, options, instance, create_fragment, safe_not_equal, {});

		dispatch_dev("SvelteRegisterComponent", {
			component: this,
			tagName: "Nav",
			options,
			id: create_fragment.name
		});
	}
}

/* src/routes/_layout.svelte generated by Svelte v3.24.0 */
const file$1 = "src/routes/_layout.svelte";

function create_fragment$1(ctx) {
	let nav;
	let t;
	let main;
	let current;

	nav = new Nav({
			props: { segment: /*segment*/ ctx[0] },
			$$inline: true
		});

	const default_slot_template = /*$$slots*/ ctx[2].default;
	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[1], null);

	const block = {
		c: function create() {
			create_component(nav.$$.fragment);
			t = space();
			main = element("main");
			if (default_slot) default_slot.c();
			this.h();
		},
		l: function claim(nodes) {
			claim_component(nav.$$.fragment, nodes);
			t = claim_space(nodes);
			main = claim_element(nodes, "MAIN", { class: true });
			var main_nodes = children(main);
			if (default_slot) default_slot.l(main_nodes);
			main_nodes.forEach(detach_dev);
			this.h();
		},
		h: function hydrate() {
			attr_dev(main, "class", "svelte-1uhnsl8");
			add_location(main, file$1, 19, 0, 262);
		},
		m: function mount(target, anchor) {
			mount_component(nav, target, anchor);
			insert_dev(target, t, anchor);
			insert_dev(target, main, anchor);

			if (default_slot) {
				default_slot.m(main, null);
			}

			current = true;
		},
		p: function update(ctx, [dirty]) {
			const nav_changes = {};
			if (dirty & /*segment*/ 1) nav_changes.segment = /*segment*/ ctx[0];
			nav.$set(nav_changes);

			if (default_slot) {
				if (default_slot.p && dirty & /*$$scope*/ 2) {
					update_slot(default_slot, default_slot_template, ctx, /*$$scope*/ ctx[1], dirty, null, null);
				}
			}
		},
		i: function intro(local) {
			if (current) return;
			transition_in(nav.$$.fragment, local);
			transition_in(default_slot, local);
			current = true;
		},
		o: function outro(local) {
			transition_out(nav.$$.fragment, local);
			transition_out(default_slot, local);
			current = false;
		},
		d: function destroy(detaching) {
			destroy_component(nav, detaching);
			if (detaching) detach_dev(t);
			if (detaching) detach_dev(main);
			if (default_slot) default_slot.d(detaching);
		}
	};

	dispatch_dev("SvelteRegisterBlock", {
		block,
		id: create_fragment$1.name,
		type: "component",
		source: "",
		ctx
	});

	return block;
}

function instance$1($$self, $$props, $$invalidate) {
	let { segment } = $$props;
	const writable_props = ["segment"];

	Object.keys($$props).forEach(key => {
		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Layout> was created with unknown prop '${key}'`);
	});

	let { $$slots = {}, $$scope } = $$props;
	validate_slots("Layout", $$slots, ['default']);

	$$self.$set = $$props => {
		if ("segment" in $$props) $$invalidate(0, segment = $$props.segment);
		if ("$$scope" in $$props) $$invalidate(1, $$scope = $$props.$$scope);
	};

	$$self.$capture_state = () => ({ Nav, segment });

	$$self.$inject_state = $$props => {
		if ("segment" in $$props) $$invalidate(0, segment = $$props.segment);
	};

	if ($$props && "$$inject" in $$props) {
		$$self.$inject_state($$props.$$inject);
	}

	return [segment, $$scope, $$slots];
}

class Layout extends SvelteComponentDev {
	constructor(options) {
		super(options);
		init(this, options, instance$1, create_fragment$1, safe_not_equal, { segment: 0 });

		dispatch_dev("SvelteRegisterComponent", {
			component: this,
			tagName: "Layout",
			options,
			id: create_fragment$1.name
		});

		const { ctx } = this.$$;
		const props = options.props || {};

		if (/*segment*/ ctx[0] === undefined && !("segment" in props)) {
			console.warn("<Layout> was created without expected prop 'segment'");
		}
	}

	get segment() {
		throw new Error("<Layout>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
	}

	set segment(value) {
		throw new Error("<Layout>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
	}
}

/* src/routes/_error.svelte generated by Svelte v3.24.0 */

const { Error: Error_1 } = globals;
const file$2 = "src/routes/_error.svelte";

// (38:0) {#if dev && error.stack}
function create_if_block(ctx) {
	let pre;
	let t_value = /*error*/ ctx[1].stack + "";
	let t;

	const block = {
		c: function create() {
			pre = element("pre");
			t = text(t_value);
			this.h();
		},
		l: function claim(nodes) {
			pre = claim_element(nodes, "PRE", {});
			var pre_nodes = children(pre);
			t = claim_text(pre_nodes, t_value);
			pre_nodes.forEach(detach_dev);
			this.h();
		},
		h: function hydrate() {
			add_location(pre, file$2, 38, 1, 443);
		},
		m: function mount(target, anchor) {
			insert_dev(target, pre, anchor);
			append_dev(pre, t);
		},
		p: function update(ctx, dirty) {
			if (dirty & /*error*/ 2 && t_value !== (t_value = /*error*/ ctx[1].stack + "")) set_data_dev(t, t_value);
		},
		d: function destroy(detaching) {
			if (detaching) detach_dev(pre);
		}
	};

	dispatch_dev("SvelteRegisterBlock", {
		block,
		id: create_if_block.name,
		type: "if",
		source: "(38:0) {#if dev && error.stack}",
		ctx
	});

	return block;
}

function create_fragment$2(ctx) {
	let title_value;
	let t0;
	let h1;
	let t1;
	let t2;
	let p;
	let t3_value = /*error*/ ctx[1].message + "";
	let t3;
	let t4;
	let if_block_anchor;
	document.title = title_value = /*status*/ ctx[0];
	let if_block = /*dev*/ ctx[2] && /*error*/ ctx[1].stack && create_if_block(ctx);

	const block = {
		c: function create() {
			t0 = space();
			h1 = element("h1");
			t1 = text(/*status*/ ctx[0]);
			t2 = space();
			p = element("p");
			t3 = text(t3_value);
			t4 = space();
			if (if_block) if_block.c();
			if_block_anchor = empty();
			this.h();
		},
		l: function claim(nodes) {
			const head_nodes = query_selector_all("[data-svelte=\"svelte-1o9r2ue\"]", document.head);
			head_nodes.forEach(detach_dev);
			t0 = claim_space(nodes);
			h1 = claim_element(nodes, "H1", { class: true });
			var h1_nodes = children(h1);
			t1 = claim_text(h1_nodes, /*status*/ ctx[0]);
			h1_nodes.forEach(detach_dev);
			t2 = claim_space(nodes);
			p = claim_element(nodes, "P", { class: true });
			var p_nodes = children(p);
			t3 = claim_text(p_nodes, t3_value);
			p_nodes.forEach(detach_dev);
			t4 = claim_space(nodes);
			if (if_block) if_block.l(nodes);
			if_block_anchor = empty();
			this.h();
		},
		h: function hydrate() {
			attr_dev(h1, "class", "svelte-8od9u6");
			add_location(h1, file$2, 33, 0, 374);
			attr_dev(p, "class", "svelte-8od9u6");
			add_location(p, file$2, 35, 0, 393);
		},
		m: function mount(target, anchor) {
			insert_dev(target, t0, anchor);
			insert_dev(target, h1, anchor);
			append_dev(h1, t1);
			insert_dev(target, t2, anchor);
			insert_dev(target, p, anchor);
			append_dev(p, t3);
			insert_dev(target, t4, anchor);
			if (if_block) if_block.m(target, anchor);
			insert_dev(target, if_block_anchor, anchor);
		},
		p: function update(ctx, [dirty]) {
			if (dirty & /*status*/ 1 && title_value !== (title_value = /*status*/ ctx[0])) {
				document.title = title_value;
			}

			if (dirty & /*status*/ 1) set_data_dev(t1, /*status*/ ctx[0]);
			if (dirty & /*error*/ 2 && t3_value !== (t3_value = /*error*/ ctx[1].message + "")) set_data_dev(t3, t3_value);

			if (/*dev*/ ctx[2] && /*error*/ ctx[1].stack) {
				if (if_block) {
					if_block.p(ctx, dirty);
				} else {
					if_block = create_if_block(ctx);
					if_block.c();
					if_block.m(if_block_anchor.parentNode, if_block_anchor);
				}
			} else if (if_block) {
				if_block.d(1);
				if_block = null;
			}
		},
		i: noop,
		o: noop,
		d: function destroy(detaching) {
			if (detaching) detach_dev(t0);
			if (detaching) detach_dev(h1);
			if (detaching) detach_dev(t2);
			if (detaching) detach_dev(p);
			if (detaching) detach_dev(t4);
			if (if_block) if_block.d(detaching);
			if (detaching) detach_dev(if_block_anchor);
		}
	};

	dispatch_dev("SvelteRegisterBlock", {
		block,
		id: create_fragment$2.name,
		type: "component",
		source: "",
		ctx
	});

	return block;
}

function instance$2($$self, $$props, $$invalidate) {
	let { status } = $$props;
	let { error } = $$props;
	const dev = "development" === "development";
	const writable_props = ["status", "error"];

	Object.keys($$props).forEach(key => {
		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Error> was created with unknown prop '${key}'`);
	});

	let { $$slots = {}, $$scope } = $$props;
	validate_slots("Error", $$slots, []);

	$$self.$set = $$props => {
		if ("status" in $$props) $$invalidate(0, status = $$props.status);
		if ("error" in $$props) $$invalidate(1, error = $$props.error);
	};

	$$self.$capture_state = () => ({ status, error, dev });

	$$self.$inject_state = $$props => {
		if ("status" in $$props) $$invalidate(0, status = $$props.status);
		if ("error" in $$props) $$invalidate(1, error = $$props.error);
	};

	if ($$props && "$$inject" in $$props) {
		$$self.$inject_state($$props.$$inject);
	}

	return [status, error, dev];
}

class Error$1 extends SvelteComponentDev {
	constructor(options) {
		super(options);
		init(this, options, instance$2, create_fragment$2, safe_not_equal, { status: 0, error: 1 });

		dispatch_dev("SvelteRegisterComponent", {
			component: this,
			tagName: "Error",
			options,
			id: create_fragment$2.name
		});

		const { ctx } = this.$$;
		const props = options.props || {};

		if (/*status*/ ctx[0] === undefined && !("status" in props)) {
			console.warn("<Error> was created without expected prop 'status'");
		}

		if (/*error*/ ctx[1] === undefined && !("error" in props)) {
			console.warn("<Error> was created without expected prop 'error'");
		}
	}

	get status() {
		throw new Error_1("<Error>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
	}

	set status(value) {
		throw new Error_1("<Error>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
	}

	get error() {
		throw new Error_1("<Error>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
	}

	set error(value) {
		throw new Error_1("<Error>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
	}
}

/* src/node_modules/@sapper/internal/App.svelte generated by Svelte v3.24.0 */

const { Error: Error_1$1 } = globals;

// (23:1) {:else}
function create_else_block(ctx) {
	let switch_instance;
	let switch_instance_anchor;
	let current;
	const switch_instance_spread_levels = [/*level1*/ ctx[4].props];
	var switch_value = /*level1*/ ctx[4].component;

	function switch_props(ctx) {
		let switch_instance_props = {};

		for (let i = 0; i < switch_instance_spread_levels.length; i += 1) {
			switch_instance_props = assign(switch_instance_props, switch_instance_spread_levels[i]);
		}

		return {
			props: switch_instance_props,
			$$inline: true
		};
	}

	if (switch_value) {
		switch_instance = new switch_value(switch_props());
	}

	const block = {
		c: function create() {
			if (switch_instance) create_component(switch_instance.$$.fragment);
			switch_instance_anchor = empty();
		},
		l: function claim(nodes) {
			if (switch_instance) claim_component(switch_instance.$$.fragment, nodes);
			switch_instance_anchor = empty();
		},
		m: function mount(target, anchor) {
			if (switch_instance) {
				mount_component(switch_instance, target, anchor);
			}

			insert_dev(target, switch_instance_anchor, anchor);
			current = true;
		},
		p: function update(ctx, dirty) {
			const switch_instance_changes = (dirty & /*level1*/ 16)
			? get_spread_update(switch_instance_spread_levels, [get_spread_object(/*level1*/ ctx[4].props)])
			: {};

			if (switch_value !== (switch_value = /*level1*/ ctx[4].component)) {
				if (switch_instance) {
					group_outros();
					const old_component = switch_instance;

					transition_out(old_component.$$.fragment, 1, 0, () => {
						destroy_component(old_component, 1);
					});

					check_outros();
				}

				if (switch_value) {
					switch_instance = new switch_value(switch_props());
					create_component(switch_instance.$$.fragment);
					transition_in(switch_instance.$$.fragment, 1);
					mount_component(switch_instance, switch_instance_anchor.parentNode, switch_instance_anchor);
				} else {
					switch_instance = null;
				}
			} else if (switch_value) {
				switch_instance.$set(switch_instance_changes);
			}
		},
		i: function intro(local) {
			if (current) return;
			if (switch_instance) transition_in(switch_instance.$$.fragment, local);
			current = true;
		},
		o: function outro(local) {
			if (switch_instance) transition_out(switch_instance.$$.fragment, local);
			current = false;
		},
		d: function destroy(detaching) {
			if (detaching) detach_dev(switch_instance_anchor);
			if (switch_instance) destroy_component(switch_instance, detaching);
		}
	};

	dispatch_dev("SvelteRegisterBlock", {
		block,
		id: create_else_block.name,
		type: "else",
		source: "(23:1) {:else}",
		ctx
	});

	return block;
}

// (21:1) {#if error}
function create_if_block$1(ctx) {
	let error_1;
	let current;

	error_1 = new Error$1({
			props: {
				error: /*error*/ ctx[0],
				status: /*status*/ ctx[1]
			},
			$$inline: true
		});

	const block = {
		c: function create() {
			create_component(error_1.$$.fragment);
		},
		l: function claim(nodes) {
			claim_component(error_1.$$.fragment, nodes);
		},
		m: function mount(target, anchor) {
			mount_component(error_1, target, anchor);
			current = true;
		},
		p: function update(ctx, dirty) {
			const error_1_changes = {};
			if (dirty & /*error*/ 1) error_1_changes.error = /*error*/ ctx[0];
			if (dirty & /*status*/ 2) error_1_changes.status = /*status*/ ctx[1];
			error_1.$set(error_1_changes);
		},
		i: function intro(local) {
			if (current) return;
			transition_in(error_1.$$.fragment, local);
			current = true;
		},
		o: function outro(local) {
			transition_out(error_1.$$.fragment, local);
			current = false;
		},
		d: function destroy(detaching) {
			destroy_component(error_1, detaching);
		}
	};

	dispatch_dev("SvelteRegisterBlock", {
		block,
		id: create_if_block$1.name,
		type: "if",
		source: "(21:1) {#if error}",
		ctx
	});

	return block;
}

// (20:0) <Layout segment="{segments[0]}" {...level0.props}>
function create_default_slot(ctx) {
	let current_block_type_index;
	let if_block;
	let if_block_anchor;
	let current;
	const if_block_creators = [create_if_block$1, create_else_block];
	const if_blocks = [];

	function select_block_type(ctx, dirty) {
		if (/*error*/ ctx[0]) return 0;
		return 1;
	}

	current_block_type_index = select_block_type(ctx);
	if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);

	const block = {
		c: function create() {
			if_block.c();
			if_block_anchor = empty();
		},
		l: function claim(nodes) {
			if_block.l(nodes);
			if_block_anchor = empty();
		},
		m: function mount(target, anchor) {
			if_blocks[current_block_type_index].m(target, anchor);
			insert_dev(target, if_block_anchor, anchor);
			current = true;
		},
		p: function update(ctx, dirty) {
			let previous_block_index = current_block_type_index;
			current_block_type_index = select_block_type(ctx);

			if (current_block_type_index === previous_block_index) {
				if_blocks[current_block_type_index].p(ctx, dirty);
			} else {
				group_outros();

				transition_out(if_blocks[previous_block_index], 1, 1, () => {
					if_blocks[previous_block_index] = null;
				});

				check_outros();
				if_block = if_blocks[current_block_type_index];

				if (!if_block) {
					if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
					if_block.c();
				}

				transition_in(if_block, 1);
				if_block.m(if_block_anchor.parentNode, if_block_anchor);
			}
		},
		i: function intro(local) {
			if (current) return;
			transition_in(if_block);
			current = true;
		},
		o: function outro(local) {
			transition_out(if_block);
			current = false;
		},
		d: function destroy(detaching) {
			if_blocks[current_block_type_index].d(detaching);
			if (detaching) detach_dev(if_block_anchor);
		}
	};

	dispatch_dev("SvelteRegisterBlock", {
		block,
		id: create_default_slot.name,
		type: "slot",
		source: "(20:0) <Layout segment=\\\"{segments[0]}\\\" {...level0.props}>",
		ctx
	});

	return block;
}

function create_fragment$3(ctx) {
	let layout;
	let current;
	const layout_spread_levels = [{ segment: /*segments*/ ctx[2][0] }, /*level0*/ ctx[3].props];

	let layout_props = {
		$$slots: { default: [create_default_slot] },
		$$scope: { ctx }
	};

	for (let i = 0; i < layout_spread_levels.length; i += 1) {
		layout_props = assign(layout_props, layout_spread_levels[i]);
	}

	layout = new Layout({ props: layout_props, $$inline: true });

	const block = {
		c: function create() {
			create_component(layout.$$.fragment);
		},
		l: function claim(nodes) {
			claim_component(layout.$$.fragment, nodes);
		},
		m: function mount(target, anchor) {
			mount_component(layout, target, anchor);
			current = true;
		},
		p: function update(ctx, [dirty]) {
			const layout_changes = (dirty & /*segments, level0*/ 12)
			? get_spread_update(layout_spread_levels, [
					dirty & /*segments*/ 4 && { segment: /*segments*/ ctx[2][0] },
					dirty & /*level0*/ 8 && get_spread_object(/*level0*/ ctx[3].props)
				])
			: {};

			if (dirty & /*$$scope, error, status, level1*/ 147) {
				layout_changes.$$scope = { dirty, ctx };
			}

			layout.$set(layout_changes);
		},
		i: function intro(local) {
			if (current) return;
			transition_in(layout.$$.fragment, local);
			current = true;
		},
		o: function outro(local) {
			transition_out(layout.$$.fragment, local);
			current = false;
		},
		d: function destroy(detaching) {
			destroy_component(layout, detaching);
		}
	};

	dispatch_dev("SvelteRegisterBlock", {
		block,
		id: create_fragment$3.name,
		type: "component",
		source: "",
		ctx
	});

	return block;
}

function instance$3($$self, $$props, $$invalidate) {
	let { stores } = $$props;
	let { error } = $$props;
	let { status } = $$props;
	let { segments } = $$props;
	let { level0 } = $$props;
	let { level1 = null } = $$props;
	let { notify } = $$props;
	afterUpdate(notify);
	setContext(CONTEXT_KEY, stores);
	const writable_props = ["stores", "error", "status", "segments", "level0", "level1", "notify"];

	Object.keys($$props).forEach(key => {
		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<App> was created with unknown prop '${key}'`);
	});

	let { $$slots = {}, $$scope } = $$props;
	validate_slots("App", $$slots, []);

	$$self.$set = $$props => {
		if ("stores" in $$props) $$invalidate(5, stores = $$props.stores);
		if ("error" in $$props) $$invalidate(0, error = $$props.error);
		if ("status" in $$props) $$invalidate(1, status = $$props.status);
		if ("segments" in $$props) $$invalidate(2, segments = $$props.segments);
		if ("level0" in $$props) $$invalidate(3, level0 = $$props.level0);
		if ("level1" in $$props) $$invalidate(4, level1 = $$props.level1);
		if ("notify" in $$props) $$invalidate(6, notify = $$props.notify);
	};

	$$self.$capture_state = () => ({
		setContext,
		afterUpdate,
		CONTEXT_KEY,
		Layout,
		Error: Error$1,
		stores,
		error,
		status,
		segments,
		level0,
		level1,
		notify
	});

	$$self.$inject_state = $$props => {
		if ("stores" in $$props) $$invalidate(5, stores = $$props.stores);
		if ("error" in $$props) $$invalidate(0, error = $$props.error);
		if ("status" in $$props) $$invalidate(1, status = $$props.status);
		if ("segments" in $$props) $$invalidate(2, segments = $$props.segments);
		if ("level0" in $$props) $$invalidate(3, level0 = $$props.level0);
		if ("level1" in $$props) $$invalidate(4, level1 = $$props.level1);
		if ("notify" in $$props) $$invalidate(6, notify = $$props.notify);
	};

	if ($$props && "$$inject" in $$props) {
		$$self.$inject_state($$props.$$inject);
	}

	return [error, status, segments, level0, level1, stores, notify];
}

class App extends SvelteComponentDev {
	constructor(options) {
		super(options);

		init(this, options, instance$3, create_fragment$3, safe_not_equal, {
			stores: 5,
			error: 0,
			status: 1,
			segments: 2,
			level0: 3,
			level1: 4,
			notify: 6
		});

		dispatch_dev("SvelteRegisterComponent", {
			component: this,
			tagName: "App",
			options,
			id: create_fragment$3.name
		});

		const { ctx } = this.$$;
		const props = options.props || {};

		if (/*stores*/ ctx[5] === undefined && !("stores" in props)) {
			console.warn("<App> was created without expected prop 'stores'");
		}

		if (/*error*/ ctx[0] === undefined && !("error" in props)) {
			console.warn("<App> was created without expected prop 'error'");
		}

		if (/*status*/ ctx[1] === undefined && !("status" in props)) {
			console.warn("<App> was created without expected prop 'status'");
		}

		if (/*segments*/ ctx[2] === undefined && !("segments" in props)) {
			console.warn("<App> was created without expected prop 'segments'");
		}

		if (/*level0*/ ctx[3] === undefined && !("level0" in props)) {
			console.warn("<App> was created without expected prop 'level0'");
		}

		if (/*notify*/ ctx[6] === undefined && !("notify" in props)) {
			console.warn("<App> was created without expected prop 'notify'");
		}
	}

	get stores() {
		throw new Error_1$1("<App>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
	}

	set stores(value) {
		throw new Error_1$1("<App>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
	}

	get error() {
		throw new Error_1$1("<App>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
	}

	set error(value) {
		throw new Error_1$1("<App>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
	}

	get status() {
		throw new Error_1$1("<App>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
	}

	set status(value) {
		throw new Error_1$1("<App>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
	}

	get segments() {
		throw new Error_1$1("<App>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
	}

	set segments(value) {
		throw new Error_1$1("<App>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
	}

	get level0() {
		throw new Error_1$1("<App>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
	}

	set level0(value) {
		throw new Error_1$1("<App>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
	}

	get level1() {
		throw new Error_1$1("<App>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
	}

	set level1(value) {
		throw new Error_1$1("<App>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
	}

	get notify() {
		throw new Error_1$1("<App>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
	}

	set notify(value) {
		throw new Error_1$1("<App>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
	}
}

// This file is generated by Sapper — do not edit it!

const ignore = [/^\/index\/?$/];

const components = [
	{
		js: () => import('./index.6a9ea31f.js'),
		css: []
	}
];

const routes = [
	{
		// index.svelte
		pattern: /^\/$/,
		parts: [
			{ i: 0 }
		]
	}
];

if (typeof window !== 'undefined') {
	import('./sapper-dev-client.1e7a4a5e.js').then(client => {
		client.connect(10000);
	});
}

function goto(href, opts = { replaceState: false }) {
	const target = select_target(new URL(href, document.baseURI));

	if (target) {
		_history[opts.replaceState ? 'replaceState' : 'pushState']({ id: cid }, '', href);
		return navigate(target, null).then(() => {});
	}

	location.href = href;
	return new Promise(f => {}); // never resolves
}

/** Callback to inform of a value updates. */



















function page_store(value) {
	const store = writable(value);
	let ready = true;

	function notify() {
		ready = true;
		store.update(val => val);
	}

	function set(new_value) {
		ready = false;
		store.set(new_value);
	}

	function subscribe(run) {
		let old_value;
		return store.subscribe((value) => {
			if (old_value === undefined || (ready && value !== old_value)) {
				run(old_value = value);
			}
		});
	}

	return { notify, set, subscribe };
}

const initial_data = typeof __SAPPER__ !== 'undefined' && __SAPPER__;

let ready = false;
let root_component;
let current_token;
let root_preloaded;
let current_branch = [];
let current_query = '{}';

const stores = {
	page: page_store({}),
	preloading: writable(null),
	session: writable(initial_data && initial_data.session)
};

let $session;
let session_dirty;

stores.session.subscribe(async value => {
	$session = value;

	if (!ready) return;
	session_dirty = true;

	const target = select_target(new URL(location.href));

	const token = current_token = {};
	const { redirect, props, branch } = await hydrate_target(target);
	if (token !== current_token) return; // a secondary navigation happened while we were loading

	await render(redirect, branch, props, target.page);
});

let prefetching


 = null;
function set_prefetching(href, promise) {
	prefetching = { href, promise };
}

let target;
function set_target(element) {
	target = element;
}

let uid = 1;
function set_uid(n) {
	uid = n;
}

let cid;
function set_cid(n) {
	cid = n;
}

const _history = typeof history !== 'undefined' ? history : {
	pushState: (state, title, href) => {},
	replaceState: (state, title, href) => {},
	scrollRestoration: ''
};

const scroll_history = {};

function extract_query(search) {
	const query = Object.create(null);
	if (search.length > 0) {
		search.slice(1).split('&').forEach(searchParam => {
			let [, key, value = ''] = /([^=]*)(?:=(.*))?/.exec(decodeURIComponent(searchParam.replace(/\+/g, ' ')));
			if (typeof query[key] === 'string') query[key] = [query[key]];
			if (typeof query[key] === 'object') (query[key] ).push(value);
			else query[key] = value;
		});
	}
	return query;
}

function select_target(url) {
	if (url.origin !== location.origin) return null;
	if (!url.pathname.startsWith(initial_data.baseUrl)) return null;

	let path = url.pathname.slice(initial_data.baseUrl.length);

	if (path === '') {
		path = '/';
	}

	// avoid accidental clashes between server routes and page routes
	if (ignore.some(pattern => pattern.test(path))) return;

	for (let i = 0; i < routes.length; i += 1) {
		const route = routes[i];

		const match = route.pattern.exec(path);

		if (match) {
			const query = extract_query(url.search);
			const part = route.parts[route.parts.length - 1];
			const params = part.params ? part.params(match) : {};

			const page = { host: location.host, path, query, params };

			return { href: url.href, route, match, page };
		}
	}
}

function handle_error(url) {
	const { host, pathname, search } = location;
	const { session, preloaded, status, error } = initial_data;

	if (!root_preloaded) {
		root_preloaded = preloaded && preloaded[0];
	}

	const props = {
		error,
		status,
		session,
		level0: {
			props: root_preloaded
		},
		level1: {
			props: {
				status,
				error
			},
			component: Error$1
		},
		segments: preloaded

	};
	const query = extract_query(search);
	render(null, [], props, { host, path: pathname, query, params: {} });
}

function scroll_state() {
	return {
		x: pageXOffset,
		y: pageYOffset
	};
}

async function navigate(target, id, noscroll, hash) {
	if (id) {
		// popstate or initial navigation
		cid = id;
	} else {
		const current_scroll = scroll_state();

		// clicked on a link. preserve scroll state
		scroll_history[cid] = current_scroll;

		id = cid = ++uid;
		scroll_history[cid] = noscroll ? current_scroll : { x: 0, y: 0 };
	}

	cid = id;

	if (root_component) stores.preloading.set(true);

	const loaded = prefetching && prefetching.href === target.href ?
		prefetching.promise :
		hydrate_target(target);

	prefetching = null;

	const token = current_token = {};
	const { redirect, props, branch } = await loaded;
	if (token !== current_token) return; // a secondary navigation happened while we were loading

	await render(redirect, branch, props, target.page);
	if (document.activeElement) document.activeElement.blur();

	if (!noscroll) {
		let scroll = scroll_history[id];

		if (hash) {
			// scroll is an element id (from a hash), we need to compute y.
			const deep_linked = document.getElementById(hash.slice(1));

			if (deep_linked) {
				scroll = {
					x: 0,
					y: deep_linked.getBoundingClientRect().top + scrollY
				};
			}
		}

		scroll_history[cid] = scroll;
		if (scroll) scrollTo(scroll.x, scroll.y);
	}
}

async function render(redirect, branch, props, page) {
	if (redirect) return goto(redirect.location, { replaceState: true });

	stores.page.set(page);
	stores.preloading.set(false);

	if (root_component) {
		root_component.$set(props);
	} else {
		props.stores = {
			page: { subscribe: stores.page.subscribe },
			preloading: { subscribe: stores.preloading.subscribe },
			session: stores.session
		};
		props.level0 = {
			props: await root_preloaded
		};
		props.notify = stores.page.notify;

		// first load — remove SSR'd <head> contents
		const start = document.querySelector('#sapper-head-start');
		const end = document.querySelector('#sapper-head-end');

		if (start && end) {
			while (start.nextSibling !== end) detach$1(start.nextSibling);
			detach$1(start);
			detach$1(end);
		}

		root_component = new App({
			target,
			props,
			hydrate: true
		});
	}

	current_branch = branch;
	current_query = JSON.stringify(page.query);
	ready = true;
	session_dirty = false;
}

function part_changed(i, segment, match, stringified_query) {
	// TODO only check query string changes for preload functions
	// that do in fact depend on it (using static analysis or
	// runtime instrumentation)
	if (stringified_query !== current_query) return true;

	const previous = current_branch[i];

	if (!previous) return false;
	if (segment !== previous.segment) return true;
	if (previous.match) {
		if (JSON.stringify(previous.match.slice(1, i + 2)) !== JSON.stringify(match.slice(1, i + 2))) {
			return true;
		}
	}
}

async function hydrate_target(target)



 {
	const { route, page } = target;
	const segments = page.path.split('/').filter(Boolean);

	let redirect = null;

	const props = { error: null, status: 200, segments: [segments[0]] };

	const preload_context = {
		fetch: (url, opts) => fetch(url, opts),
		redirect: (statusCode, location) => {
			if (redirect && (redirect.statusCode !== statusCode || redirect.location !== location)) {
				throw new Error(`Conflicting redirects`);
			}
			redirect = { statusCode, location };
		},
		error: (status, error) => {
			props.error = typeof error === 'string' ? new Error(error) : error;
			props.status = status;
		}
	};

	if (!root_preloaded) {
		root_preloaded = initial_data.preloaded[0] || preload.call(preload_context, {
			host: page.host,
			path: page.path,
			query: page.query,
			params: {}
		}, $session);
	}

	let branch;
	let l = 1;

	try {
		const stringified_query = JSON.stringify(page.query);
		const match = route.pattern.exec(page.path);

		let segment_dirty = false;

		branch = await Promise.all(route.parts.map(async (part, i) => {
			const segment = segments[i];

			if (part_changed(i, segment, match, stringified_query)) segment_dirty = true;

			props.segments[l] = segments[i + 1]; // TODO make this less confusing
			if (!part) return { segment };

			const j = l++;

			if (!session_dirty && !segment_dirty && current_branch[i] && current_branch[i].part === part.i) {
				return current_branch[i];
			}

			segment_dirty = false;

			const { default: component, preload } = await load_component(components[part.i]);

			let preloaded;
			if (ready || !initial_data.preloaded[i + 1]) {
				preloaded = preload
					? await preload.call(preload_context, {
						host: page.host,
						path: page.path,
						query: page.query,
						params: part.params ? part.params(target.match) : {}
					}, $session)
					: {};
			} else {
				preloaded = initial_data.preloaded[i + 1];
			}

			return (props[`level${j}`] = { component, props: preloaded, segment, match, part: part.i });
		}));
	} catch (error) {
		props.error = error;
		props.status = 500;
		branch = [];
	}

	return { redirect, props, branch };
}

function load_css(chunk) {
	const href = `client/${chunk}`;
	if (document.querySelector(`link[href="${href}"]`)) return;

	return new Promise((fulfil, reject) => {
		const link = document.createElement('link');
		link.rel = 'stylesheet';
		link.href = href;

		link.onload = () => fulfil();
		link.onerror = reject;

		document.head.appendChild(link);
	});
}

function load_component(component)


 {
	// TODO this is temporary — once placeholders are
	// always rewritten, scratch the ternary
	const promises = (typeof component.css === 'string' ? [] : component.css.map(load_css));
	promises.unshift(component.js());
	return Promise.all(promises).then(values => values[0]);
}

function detach$1(node) {
	node.parentNode.removeChild(node);
}

function prefetch(href) {
	const target = select_target(new URL(href, document.baseURI));

	if (target) {
		if (!prefetching || href !== prefetching.href) {
			set_prefetching(href, hydrate_target(target));
		}

		return prefetching.promise;
	}
}

function start(opts

) {
	if ('scrollRestoration' in _history) {
		_history.scrollRestoration = 'manual';
	}
	
	// Adopted from Nuxt.js
	// Reset scrollRestoration to auto when leaving page, allowing page reload
	// and back-navigation from other pages to use the browser to restore the
	// scrolling position.
	addEventListener('beforeunload', () => {
		_history.scrollRestoration = 'auto';
	});

	// Setting scrollRestoration to manual again when returning to this page.
	addEventListener('load', () => {
		_history.scrollRestoration = 'manual';
	});

	set_target(opts.target);

	addEventListener('click', handle_click);
	addEventListener('popstate', handle_popstate);

	// prefetch
	addEventListener('touchstart', trigger_prefetch);
	addEventListener('mousemove', handle_mousemove);

	return Promise.resolve().then(() => {
		const { hash, href } = location;

		_history.replaceState({ id: uid }, '', href);

		const url = new URL(location.href);

		if (initial_data.error) return handle_error();

		const target = select_target(url);
		if (target) return navigate(target, uid, true, hash);
	});
}

let mousemove_timeout;

function handle_mousemove(event) {
	clearTimeout(mousemove_timeout);
	mousemove_timeout = setTimeout(() => {
		trigger_prefetch(event);
	}, 20);
}

function trigger_prefetch(event) {
	const a = find_anchor(event.target);
	if (!a || a.rel !== 'prefetch') return;

	prefetch(a.href);
}

function handle_click(event) {
	// Adapted from https://github.com/visionmedia/page.js
	// MIT license https://github.com/visionmedia/page.js#license
	if (which(event) !== 1) return;
	if (event.metaKey || event.ctrlKey || event.shiftKey) return;
	if (event.defaultPrevented) return;

	const a = find_anchor(event.target);
	if (!a) return;

	if (!a.href) return;

	// check if link is inside an svg
	// in this case, both href and target are always inside an object
	const svg = typeof a.href === 'object' && a.href.constructor.name === 'SVGAnimatedString';
	const href = String(svg ? (a).href.baseVal : a.href);

	if (href === location.href) {
		if (!location.hash) event.preventDefault();
		return;
	}

	// Ignore if tag has
	// 1. 'download' attribute
	// 2. rel='external' attribute
	if (a.hasAttribute('download') || a.getAttribute('rel') === 'external') return;

	// Ignore if <a> has a target
	if (svg ? (a).target.baseVal : a.target) return;

	const url = new URL(href);

	// Don't handle hash changes
	if (url.pathname === location.pathname && url.search === location.search) return;

	const target = select_target(url);
	if (target) {
		const noscroll = a.hasAttribute('sapper-noscroll');
		navigate(target, null, noscroll, url.hash);
		event.preventDefault();
		_history.pushState({ id: cid }, '', url.href);
	}
}

function which(event) {
	return event.which === null ? event.button : event.which;
}

function find_anchor(node) {
	while (node && node.nodeName.toUpperCase() !== 'A') node = node.parentNode; // SVG <a> elements have a lowercase name
	return node;
}

function handle_popstate(event) {
	scroll_history[cid] = scroll_state();

	if (event.state) {
		const url = new URL(location.href);
		const target = select_target(url);
		if (target) {
			navigate(target, event.state.id);
		} else {
			location.href = location.href;
		}
	} else {
		// hashchange
		set_uid(uid + 1);
		set_cid(uid);
		_history.replaceState({ id: cid }, '', location.href);
	}
}

const stores$1 = () => getContext(CONTEXT_KEY);

start({
	target: document.querySelector('#sapper')
});

export { SvelteComponentDev as S, stores$1 as a, validate_slots as b, component_subscribe as c, dispatch_dev as d, space as e, element as f, globals as g, detach_dev as h, init as i, claim_space as j, claim_element as k, children as l, attr_dev as m, add_location as n, onMount as o, insert_dev as p, query_selector_all as q, append_dev as r, safe_not_equal as s, noop as t, validate_store as v };
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xpZW50LjcxMDE2Y2ZmLmpzIiwic291cmNlcyI6WyIuLi8uLi8uLi9ub2RlX21vZHVsZXMvc3ZlbHRlL2ludGVybmFsL2luZGV4Lm1qcyIsIi4uLy4uLy4uL25vZGVfbW9kdWxlcy9zdmVsdGUvc3RvcmUvaW5kZXgubWpzIiwiLi4vLi4vLi4vc3JjL25vZGVfbW9kdWxlcy9Ac2FwcGVyL2ludGVybmFsL3NoYXJlZC5tanMiLCIuLi8uLi8uLi9zcmMvcm91dGVzL19sYXlvdXQuc3ZlbHRlIiwiLi4vLi4vLi4vc3JjL3JvdXRlcy9fZXJyb3Iuc3ZlbHRlIiwiLi4vLi4vLi4vc3JjL25vZGVfbW9kdWxlcy9Ac2FwcGVyL2ludGVybmFsL0FwcC5zdmVsdGUiLCIuLi8uLi8uLi9zcmMvbm9kZV9tb2R1bGVzL0BzYXBwZXIvaW50ZXJuYWwvbWFuaWZlc3QtY2xpZW50Lm1qcyIsIi4uLy4uLy4uL3NyYy9ub2RlX21vZHVsZXMvQHNhcHBlci9hcHAubWpzIiwiLi4vLi4vLi4vc3JjL2NsaWVudC5qcyJdLCJzb3VyY2VzQ29udGVudCI6WyJmdW5jdGlvbiBub29wKCkgeyB9XG5jb25zdCBpZGVudGl0eSA9IHggPT4geDtcbmZ1bmN0aW9uIGFzc2lnbih0YXIsIHNyYykge1xuICAgIC8vIEB0cy1pZ25vcmVcbiAgICBmb3IgKGNvbnN0IGsgaW4gc3JjKVxuICAgICAgICB0YXJba10gPSBzcmNba107XG4gICAgcmV0dXJuIHRhcjtcbn1cbmZ1bmN0aW9uIGlzX3Byb21pc2UodmFsdWUpIHtcbiAgICByZXR1cm4gdmFsdWUgJiYgdHlwZW9mIHZhbHVlID09PSAnb2JqZWN0JyAmJiB0eXBlb2YgdmFsdWUudGhlbiA9PT0gJ2Z1bmN0aW9uJztcbn1cbmZ1bmN0aW9uIGFkZF9sb2NhdGlvbihlbGVtZW50LCBmaWxlLCBsaW5lLCBjb2x1bW4sIGNoYXIpIHtcbiAgICBlbGVtZW50Ll9fc3ZlbHRlX21ldGEgPSB7XG4gICAgICAgIGxvYzogeyBmaWxlLCBsaW5lLCBjb2x1bW4sIGNoYXIgfVxuICAgIH07XG59XG5mdW5jdGlvbiBydW4oZm4pIHtcbiAgICByZXR1cm4gZm4oKTtcbn1cbmZ1bmN0aW9uIGJsYW5rX29iamVjdCgpIHtcbiAgICByZXR1cm4gT2JqZWN0LmNyZWF0ZShudWxsKTtcbn1cbmZ1bmN0aW9uIHJ1bl9hbGwoZm5zKSB7XG4gICAgZm5zLmZvckVhY2gocnVuKTtcbn1cbmZ1bmN0aW9uIGlzX2Z1bmN0aW9uKHRoaW5nKSB7XG4gICAgcmV0dXJuIHR5cGVvZiB0aGluZyA9PT0gJ2Z1bmN0aW9uJztcbn1cbmZ1bmN0aW9uIHNhZmVfbm90X2VxdWFsKGEsIGIpIHtcbiAgICByZXR1cm4gYSAhPSBhID8gYiA9PSBiIDogYSAhPT0gYiB8fCAoKGEgJiYgdHlwZW9mIGEgPT09ICdvYmplY3QnKSB8fCB0eXBlb2YgYSA9PT0gJ2Z1bmN0aW9uJyk7XG59XG5mdW5jdGlvbiBub3RfZXF1YWwoYSwgYikge1xuICAgIHJldHVybiBhICE9IGEgPyBiID09IGIgOiBhICE9PSBiO1xufVxuZnVuY3Rpb24gdmFsaWRhdGVfc3RvcmUoc3RvcmUsIG5hbWUpIHtcbiAgICBpZiAoc3RvcmUgIT0gbnVsbCAmJiB0eXBlb2Ygc3RvcmUuc3Vic2NyaWJlICE9PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihgJyR7bmFtZX0nIGlzIG5vdCBhIHN0b3JlIHdpdGggYSAnc3Vic2NyaWJlJyBtZXRob2RgKTtcbiAgICB9XG59XG5mdW5jdGlvbiBzdWJzY3JpYmUoc3RvcmUsIC4uLmNhbGxiYWNrcykge1xuICAgIGlmIChzdG9yZSA9PSBudWxsKSB7XG4gICAgICAgIHJldHVybiBub29wO1xuICAgIH1cbiAgICBjb25zdCB1bnN1YiA9IHN0b3JlLnN1YnNjcmliZSguLi5jYWxsYmFja3MpO1xuICAgIHJldHVybiB1bnN1Yi51bnN1YnNjcmliZSA/ICgpID0+IHVuc3ViLnVuc3Vic2NyaWJlKCkgOiB1bnN1Yjtcbn1cbmZ1bmN0aW9uIGdldF9zdG9yZV92YWx1ZShzdG9yZSkge1xuICAgIGxldCB2YWx1ZTtcbiAgICBzdWJzY3JpYmUoc3RvcmUsIF8gPT4gdmFsdWUgPSBfKSgpO1xuICAgIHJldHVybiB2YWx1ZTtcbn1cbmZ1bmN0aW9uIGNvbXBvbmVudF9zdWJzY3JpYmUoY29tcG9uZW50LCBzdG9yZSwgY2FsbGJhY2spIHtcbiAgICBjb21wb25lbnQuJCQub25fZGVzdHJveS5wdXNoKHN1YnNjcmliZShzdG9yZSwgY2FsbGJhY2spKTtcbn1cbmZ1bmN0aW9uIGNyZWF0ZV9zbG90KGRlZmluaXRpb24sIGN0eCwgJCRzY29wZSwgZm4pIHtcbiAgICBpZiAoZGVmaW5pdGlvbikge1xuICAgICAgICBjb25zdCBzbG90X2N0eCA9IGdldF9zbG90X2NvbnRleHQoZGVmaW5pdGlvbiwgY3R4LCAkJHNjb3BlLCBmbik7XG4gICAgICAgIHJldHVybiBkZWZpbml0aW9uWzBdKHNsb3RfY3R4KTtcbiAgICB9XG59XG5mdW5jdGlvbiBnZXRfc2xvdF9jb250ZXh0KGRlZmluaXRpb24sIGN0eCwgJCRzY29wZSwgZm4pIHtcbiAgICByZXR1cm4gZGVmaW5pdGlvblsxXSAmJiBmblxuICAgICAgICA/IGFzc2lnbigkJHNjb3BlLmN0eC5zbGljZSgpLCBkZWZpbml0aW9uWzFdKGZuKGN0eCkpKVxuICAgICAgICA6ICQkc2NvcGUuY3R4O1xufVxuZnVuY3Rpb24gZ2V0X3Nsb3RfY2hhbmdlcyhkZWZpbml0aW9uLCAkJHNjb3BlLCBkaXJ0eSwgZm4pIHtcbiAgICBpZiAoZGVmaW5pdGlvblsyXSAmJiBmbikge1xuICAgICAgICBjb25zdCBsZXRzID0gZGVmaW5pdGlvblsyXShmbihkaXJ0eSkpO1xuICAgICAgICBpZiAoJCRzY29wZS5kaXJ0eSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICByZXR1cm4gbGV0cztcbiAgICAgICAgfVxuICAgICAgICBpZiAodHlwZW9mIGxldHMgPT09ICdvYmplY3QnKSB7XG4gICAgICAgICAgICBjb25zdCBtZXJnZWQgPSBbXTtcbiAgICAgICAgICAgIGNvbnN0IGxlbiA9IE1hdGgubWF4KCQkc2NvcGUuZGlydHkubGVuZ3RoLCBsZXRzLmxlbmd0aCk7XG4gICAgICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IGxlbjsgaSArPSAxKSB7XG4gICAgICAgICAgICAgICAgbWVyZ2VkW2ldID0gJCRzY29wZS5kaXJ0eVtpXSB8IGxldHNbaV07XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gbWVyZ2VkO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiAkJHNjb3BlLmRpcnR5IHwgbGV0cztcbiAgICB9XG4gICAgcmV0dXJuICQkc2NvcGUuZGlydHk7XG59XG5mdW5jdGlvbiB1cGRhdGVfc2xvdChzbG90LCBzbG90X2RlZmluaXRpb24sIGN0eCwgJCRzY29wZSwgZGlydHksIGdldF9zbG90X2NoYW5nZXNfZm4sIGdldF9zbG90X2NvbnRleHRfZm4pIHtcbiAgICBjb25zdCBzbG90X2NoYW5nZXMgPSBnZXRfc2xvdF9jaGFuZ2VzKHNsb3RfZGVmaW5pdGlvbiwgJCRzY29wZSwgZGlydHksIGdldF9zbG90X2NoYW5nZXNfZm4pO1xuICAgIGlmIChzbG90X2NoYW5nZXMpIHtcbiAgICAgICAgY29uc3Qgc2xvdF9jb250ZXh0ID0gZ2V0X3Nsb3RfY29udGV4dChzbG90X2RlZmluaXRpb24sIGN0eCwgJCRzY29wZSwgZ2V0X3Nsb3RfY29udGV4dF9mbik7XG4gICAgICAgIHNsb3QucChzbG90X2NvbnRleHQsIHNsb3RfY2hhbmdlcyk7XG4gICAgfVxufVxuZnVuY3Rpb24gZXhjbHVkZV9pbnRlcm5hbF9wcm9wcyhwcm9wcykge1xuICAgIGNvbnN0IHJlc3VsdCA9IHt9O1xuICAgIGZvciAoY29uc3QgayBpbiBwcm9wcylcbiAgICAgICAgaWYgKGtbMF0gIT09ICckJylcbiAgICAgICAgICAgIHJlc3VsdFtrXSA9IHByb3BzW2tdO1xuICAgIHJldHVybiByZXN1bHQ7XG59XG5mdW5jdGlvbiBjb21wdXRlX3Jlc3RfcHJvcHMocHJvcHMsIGtleXMpIHtcbiAgICBjb25zdCByZXN0ID0ge307XG4gICAga2V5cyA9IG5ldyBTZXQoa2V5cyk7XG4gICAgZm9yIChjb25zdCBrIGluIHByb3BzKVxuICAgICAgICBpZiAoIWtleXMuaGFzKGspICYmIGtbMF0gIT09ICckJylcbiAgICAgICAgICAgIHJlc3Rba10gPSBwcm9wc1trXTtcbiAgICByZXR1cm4gcmVzdDtcbn1cbmZ1bmN0aW9uIG9uY2UoZm4pIHtcbiAgICBsZXQgcmFuID0gZmFsc2U7XG4gICAgcmV0dXJuIGZ1bmN0aW9uICguLi5hcmdzKSB7XG4gICAgICAgIGlmIChyYW4pXG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIHJhbiA9IHRydWU7XG4gICAgICAgIGZuLmNhbGwodGhpcywgLi4uYXJncyk7XG4gICAgfTtcbn1cbmZ1bmN0aW9uIG51bGxfdG9fZW1wdHkodmFsdWUpIHtcbiAgICByZXR1cm4gdmFsdWUgPT0gbnVsbCA/ICcnIDogdmFsdWU7XG59XG5mdW5jdGlvbiBzZXRfc3RvcmVfdmFsdWUoc3RvcmUsIHJldCwgdmFsdWUgPSByZXQpIHtcbiAgICBzdG9yZS5zZXQodmFsdWUpO1xuICAgIHJldHVybiByZXQ7XG59XG5jb25zdCBoYXNfcHJvcCA9IChvYmosIHByb3ApID0+IE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChvYmosIHByb3ApO1xuZnVuY3Rpb24gYWN0aW9uX2Rlc3Ryb3llcihhY3Rpb25fcmVzdWx0KSB7XG4gICAgcmV0dXJuIGFjdGlvbl9yZXN1bHQgJiYgaXNfZnVuY3Rpb24oYWN0aW9uX3Jlc3VsdC5kZXN0cm95KSA/IGFjdGlvbl9yZXN1bHQuZGVzdHJveSA6IG5vb3A7XG59XG5cbmNvbnN0IGlzX2NsaWVudCA9IHR5cGVvZiB3aW5kb3cgIT09ICd1bmRlZmluZWQnO1xubGV0IG5vdyA9IGlzX2NsaWVudFxuICAgID8gKCkgPT4gd2luZG93LnBlcmZvcm1hbmNlLm5vdygpXG4gICAgOiAoKSA9PiBEYXRlLm5vdygpO1xubGV0IHJhZiA9IGlzX2NsaWVudCA/IGNiID0+IHJlcXVlc3RBbmltYXRpb25GcmFtZShjYikgOiBub29wO1xuLy8gdXNlZCBpbnRlcm5hbGx5IGZvciB0ZXN0aW5nXG5mdW5jdGlvbiBzZXRfbm93KGZuKSB7XG4gICAgbm93ID0gZm47XG59XG5mdW5jdGlvbiBzZXRfcmFmKGZuKSB7XG4gICAgcmFmID0gZm47XG59XG5cbmNvbnN0IHRhc2tzID0gbmV3IFNldCgpO1xuZnVuY3Rpb24gcnVuX3Rhc2tzKG5vdykge1xuICAgIHRhc2tzLmZvckVhY2godGFzayA9PiB7XG4gICAgICAgIGlmICghdGFzay5jKG5vdykpIHtcbiAgICAgICAgICAgIHRhc2tzLmRlbGV0ZSh0YXNrKTtcbiAgICAgICAgICAgIHRhc2suZigpO1xuICAgICAgICB9XG4gICAgfSk7XG4gICAgaWYgKHRhc2tzLnNpemUgIT09IDApXG4gICAgICAgIHJhZihydW5fdGFza3MpO1xufVxuLyoqXG4gKiBGb3IgdGVzdGluZyBwdXJwb3NlcyBvbmx5IVxuICovXG5mdW5jdGlvbiBjbGVhcl9sb29wcygpIHtcbiAgICB0YXNrcy5jbGVhcigpO1xufVxuLyoqXG4gKiBDcmVhdGVzIGEgbmV3IHRhc2sgdGhhdCBydW5zIG9uIGVhY2ggcmFmIGZyYW1lXG4gKiB1bnRpbCBpdCByZXR1cm5zIGEgZmFsc3kgdmFsdWUgb3IgaXMgYWJvcnRlZFxuICovXG5mdW5jdGlvbiBsb29wKGNhbGxiYWNrKSB7XG4gICAgbGV0IHRhc2s7XG4gICAgaWYgKHRhc2tzLnNpemUgPT09IDApXG4gICAgICAgIHJhZihydW5fdGFza3MpO1xuICAgIHJldHVybiB7XG4gICAgICAgIHByb21pc2U6IG5ldyBQcm9taXNlKGZ1bGZpbGwgPT4ge1xuICAgICAgICAgICAgdGFza3MuYWRkKHRhc2sgPSB7IGM6IGNhbGxiYWNrLCBmOiBmdWxmaWxsIH0pO1xuICAgICAgICB9KSxcbiAgICAgICAgYWJvcnQoKSB7XG4gICAgICAgICAgICB0YXNrcy5kZWxldGUodGFzayk7XG4gICAgICAgIH1cbiAgICB9O1xufVxuXG5mdW5jdGlvbiBhcHBlbmQodGFyZ2V0LCBub2RlKSB7XG4gICAgdGFyZ2V0LmFwcGVuZENoaWxkKG5vZGUpO1xufVxuZnVuY3Rpb24gaW5zZXJ0KHRhcmdldCwgbm9kZSwgYW5jaG9yKSB7XG4gICAgdGFyZ2V0Lmluc2VydEJlZm9yZShub2RlLCBhbmNob3IgfHwgbnVsbCk7XG59XG5mdW5jdGlvbiBkZXRhY2gobm9kZSkge1xuICAgIG5vZGUucGFyZW50Tm9kZS5yZW1vdmVDaGlsZChub2RlKTtcbn1cbmZ1bmN0aW9uIGRlc3Ryb3lfZWFjaChpdGVyYXRpb25zLCBkZXRhY2hpbmcpIHtcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IGl0ZXJhdGlvbnMubGVuZ3RoOyBpICs9IDEpIHtcbiAgICAgICAgaWYgKGl0ZXJhdGlvbnNbaV0pXG4gICAgICAgICAgICBpdGVyYXRpb25zW2ldLmQoZGV0YWNoaW5nKTtcbiAgICB9XG59XG5mdW5jdGlvbiBlbGVtZW50KG5hbWUpIHtcbiAgICByZXR1cm4gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChuYW1lKTtcbn1cbmZ1bmN0aW9uIGVsZW1lbnRfaXMobmFtZSwgaXMpIHtcbiAgICByZXR1cm4gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChuYW1lLCB7IGlzIH0pO1xufVxuZnVuY3Rpb24gb2JqZWN0X3dpdGhvdXRfcHJvcGVydGllcyhvYmosIGV4Y2x1ZGUpIHtcbiAgICBjb25zdCB0YXJnZXQgPSB7fTtcbiAgICBmb3IgKGNvbnN0IGsgaW4gb2JqKSB7XG4gICAgICAgIGlmIChoYXNfcHJvcChvYmosIGspXG4gICAgICAgICAgICAvLyBAdHMtaWdub3JlXG4gICAgICAgICAgICAmJiBleGNsdWRlLmluZGV4T2YoaykgPT09IC0xKSB7XG4gICAgICAgICAgICAvLyBAdHMtaWdub3JlXG4gICAgICAgICAgICB0YXJnZXRba10gPSBvYmpba107XG4gICAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHRhcmdldDtcbn1cbmZ1bmN0aW9uIHN2Z19lbGVtZW50KG5hbWUpIHtcbiAgICByZXR1cm4gZG9jdW1lbnQuY3JlYXRlRWxlbWVudE5TKCdodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZycsIG5hbWUpO1xufVxuZnVuY3Rpb24gdGV4dChkYXRhKSB7XG4gICAgcmV0dXJuIGRvY3VtZW50LmNyZWF0ZVRleHROb2RlKGRhdGEpO1xufVxuZnVuY3Rpb24gc3BhY2UoKSB7XG4gICAgcmV0dXJuIHRleHQoJyAnKTtcbn1cbmZ1bmN0aW9uIGVtcHR5KCkge1xuICAgIHJldHVybiB0ZXh0KCcnKTtcbn1cbmZ1bmN0aW9uIGxpc3Rlbihub2RlLCBldmVudCwgaGFuZGxlciwgb3B0aW9ucykge1xuICAgIG5vZGUuYWRkRXZlbnRMaXN0ZW5lcihldmVudCwgaGFuZGxlciwgb3B0aW9ucyk7XG4gICAgcmV0dXJuICgpID0+IG5vZGUucmVtb3ZlRXZlbnRMaXN0ZW5lcihldmVudCwgaGFuZGxlciwgb3B0aW9ucyk7XG59XG5mdW5jdGlvbiBwcmV2ZW50X2RlZmF1bHQoZm4pIHtcbiAgICByZXR1cm4gZnVuY3Rpb24gKGV2ZW50KSB7XG4gICAgICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgIC8vIEB0cy1pZ25vcmVcbiAgICAgICAgcmV0dXJuIGZuLmNhbGwodGhpcywgZXZlbnQpO1xuICAgIH07XG59XG5mdW5jdGlvbiBzdG9wX3Byb3BhZ2F0aW9uKGZuKSB7XG4gICAgcmV0dXJuIGZ1bmN0aW9uIChldmVudCkge1xuICAgICAgICBldmVudC5zdG9wUHJvcGFnYXRpb24oKTtcbiAgICAgICAgLy8gQHRzLWlnbm9yZVxuICAgICAgICByZXR1cm4gZm4uY2FsbCh0aGlzLCBldmVudCk7XG4gICAgfTtcbn1cbmZ1bmN0aW9uIHNlbGYoZm4pIHtcbiAgICByZXR1cm4gZnVuY3Rpb24gKGV2ZW50KSB7XG4gICAgICAgIC8vIEB0cy1pZ25vcmVcbiAgICAgICAgaWYgKGV2ZW50LnRhcmdldCA9PT0gdGhpcylcbiAgICAgICAgICAgIGZuLmNhbGwodGhpcywgZXZlbnQpO1xuICAgIH07XG59XG5mdW5jdGlvbiBhdHRyKG5vZGUsIGF0dHJpYnV0ZSwgdmFsdWUpIHtcbiAgICBpZiAodmFsdWUgPT0gbnVsbClcbiAgICAgICAgbm9kZS5yZW1vdmVBdHRyaWJ1dGUoYXR0cmlidXRlKTtcbiAgICBlbHNlIGlmIChub2RlLmdldEF0dHJpYnV0ZShhdHRyaWJ1dGUpICE9PSB2YWx1ZSlcbiAgICAgICAgbm9kZS5zZXRBdHRyaWJ1dGUoYXR0cmlidXRlLCB2YWx1ZSk7XG59XG5mdW5jdGlvbiBzZXRfYXR0cmlidXRlcyhub2RlLCBhdHRyaWJ1dGVzKSB7XG4gICAgLy8gQHRzLWlnbm9yZVxuICAgIGNvbnN0IGRlc2NyaXB0b3JzID0gT2JqZWN0LmdldE93blByb3BlcnR5RGVzY3JpcHRvcnMobm9kZS5fX3Byb3RvX18pO1xuICAgIGZvciAoY29uc3Qga2V5IGluIGF0dHJpYnV0ZXMpIHtcbiAgICAgICAgaWYgKGF0dHJpYnV0ZXNba2V5XSA9PSBudWxsKSB7XG4gICAgICAgICAgICBub2RlLnJlbW92ZUF0dHJpYnV0ZShrZXkpO1xuICAgICAgICB9XG4gICAgICAgIGVsc2UgaWYgKGtleSA9PT0gJ3N0eWxlJykge1xuICAgICAgICAgICAgbm9kZS5zdHlsZS5jc3NUZXh0ID0gYXR0cmlidXRlc1trZXldO1xuICAgICAgICB9XG4gICAgICAgIGVsc2UgaWYgKGtleSA9PT0gJ19fdmFsdWUnKSB7XG4gICAgICAgICAgICBub2RlLnZhbHVlID0gbm9kZVtrZXldID0gYXR0cmlidXRlc1trZXldO1xuICAgICAgICB9XG4gICAgICAgIGVsc2UgaWYgKGRlc2NyaXB0b3JzW2tleV0gJiYgZGVzY3JpcHRvcnNba2V5XS5zZXQpIHtcbiAgICAgICAgICAgIG5vZGVba2V5XSA9IGF0dHJpYnV0ZXNba2V5XTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIGF0dHIobm9kZSwga2V5LCBhdHRyaWJ1dGVzW2tleV0pO1xuICAgICAgICB9XG4gICAgfVxufVxuZnVuY3Rpb24gc2V0X3N2Z19hdHRyaWJ1dGVzKG5vZGUsIGF0dHJpYnV0ZXMpIHtcbiAgICBmb3IgKGNvbnN0IGtleSBpbiBhdHRyaWJ1dGVzKSB7XG4gICAgICAgIGF0dHIobm9kZSwga2V5LCBhdHRyaWJ1dGVzW2tleV0pO1xuICAgIH1cbn1cbmZ1bmN0aW9uIHNldF9jdXN0b21fZWxlbWVudF9kYXRhKG5vZGUsIHByb3AsIHZhbHVlKSB7XG4gICAgaWYgKHByb3AgaW4gbm9kZSkge1xuICAgICAgICBub2RlW3Byb3BdID0gdmFsdWU7XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgICBhdHRyKG5vZGUsIHByb3AsIHZhbHVlKTtcbiAgICB9XG59XG5mdW5jdGlvbiB4bGlua19hdHRyKG5vZGUsIGF0dHJpYnV0ZSwgdmFsdWUpIHtcbiAgICBub2RlLnNldEF0dHJpYnV0ZU5TKCdodHRwOi8vd3d3LnczLm9yZy8xOTk5L3hsaW5rJywgYXR0cmlidXRlLCB2YWx1ZSk7XG59XG5mdW5jdGlvbiBnZXRfYmluZGluZ19ncm91cF92YWx1ZShncm91cCwgX192YWx1ZSwgY2hlY2tlZCkge1xuICAgIGNvbnN0IHZhbHVlID0gbmV3IFNldCgpO1xuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgZ3JvdXAubGVuZ3RoOyBpICs9IDEpIHtcbiAgICAgICAgaWYgKGdyb3VwW2ldLmNoZWNrZWQpXG4gICAgICAgICAgICB2YWx1ZS5hZGQoZ3JvdXBbaV0uX192YWx1ZSk7XG4gICAgfVxuICAgIGlmICghY2hlY2tlZCkge1xuICAgICAgICB2YWx1ZS5kZWxldGUoX192YWx1ZSk7XG4gICAgfVxuICAgIHJldHVybiBBcnJheS5mcm9tKHZhbHVlKTtcbn1cbmZ1bmN0aW9uIHRvX251bWJlcih2YWx1ZSkge1xuICAgIHJldHVybiB2YWx1ZSA9PT0gJycgPyB1bmRlZmluZWQgOiArdmFsdWU7XG59XG5mdW5jdGlvbiB0aW1lX3Jhbmdlc190b19hcnJheShyYW5nZXMpIHtcbiAgICBjb25zdCBhcnJheSA9IFtdO1xuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgcmFuZ2VzLmxlbmd0aDsgaSArPSAxKSB7XG4gICAgICAgIGFycmF5LnB1c2goeyBzdGFydDogcmFuZ2VzLnN0YXJ0KGkpLCBlbmQ6IHJhbmdlcy5lbmQoaSkgfSk7XG4gICAgfVxuICAgIHJldHVybiBhcnJheTtcbn1cbmZ1bmN0aW9uIGNoaWxkcmVuKGVsZW1lbnQpIHtcbiAgICByZXR1cm4gQXJyYXkuZnJvbShlbGVtZW50LmNoaWxkTm9kZXMpO1xufVxuZnVuY3Rpb24gY2xhaW1fZWxlbWVudChub2RlcywgbmFtZSwgYXR0cmlidXRlcywgc3ZnKSB7XG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBub2Rlcy5sZW5ndGg7IGkgKz0gMSkge1xuICAgICAgICBjb25zdCBub2RlID0gbm9kZXNbaV07XG4gICAgICAgIGlmIChub2RlLm5vZGVOYW1lID09PSBuYW1lKSB7XG4gICAgICAgICAgICBsZXQgaiA9IDA7XG4gICAgICAgICAgICBjb25zdCByZW1vdmUgPSBbXTtcbiAgICAgICAgICAgIHdoaWxlIChqIDwgbm9kZS5hdHRyaWJ1dGVzLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgIGNvbnN0IGF0dHJpYnV0ZSA9IG5vZGUuYXR0cmlidXRlc1tqKytdO1xuICAgICAgICAgICAgICAgIGlmICghYXR0cmlidXRlc1thdHRyaWJ1dGUubmFtZV0pIHtcbiAgICAgICAgICAgICAgICAgICAgcmVtb3ZlLnB1c2goYXR0cmlidXRlLm5hbWUpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGZvciAobGV0IGsgPSAwOyBrIDwgcmVtb3ZlLmxlbmd0aDsgaysrKSB7XG4gICAgICAgICAgICAgICAgbm9kZS5yZW1vdmVBdHRyaWJ1dGUocmVtb3ZlW2tdKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiBub2Rlcy5zcGxpY2UoaSwgMSlbMF07XG4gICAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHN2ZyA/IHN2Z19lbGVtZW50KG5hbWUpIDogZWxlbWVudChuYW1lKTtcbn1cbmZ1bmN0aW9uIGNsYWltX3RleHQobm9kZXMsIGRhdGEpIHtcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IG5vZGVzLmxlbmd0aDsgaSArPSAxKSB7XG4gICAgICAgIGNvbnN0IG5vZGUgPSBub2Rlc1tpXTtcbiAgICAgICAgaWYgKG5vZGUubm9kZVR5cGUgPT09IDMpIHtcbiAgICAgICAgICAgIG5vZGUuZGF0YSA9ICcnICsgZGF0YTtcbiAgICAgICAgICAgIHJldHVybiBub2Rlcy5zcGxpY2UoaSwgMSlbMF07XG4gICAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHRleHQoZGF0YSk7XG59XG5mdW5jdGlvbiBjbGFpbV9zcGFjZShub2Rlcykge1xuICAgIHJldHVybiBjbGFpbV90ZXh0KG5vZGVzLCAnICcpO1xufVxuZnVuY3Rpb24gc2V0X2RhdGEodGV4dCwgZGF0YSkge1xuICAgIGRhdGEgPSAnJyArIGRhdGE7XG4gICAgaWYgKHRleHQud2hvbGVUZXh0ICE9PSBkYXRhKVxuICAgICAgICB0ZXh0LmRhdGEgPSBkYXRhO1xufVxuZnVuY3Rpb24gc2V0X2lucHV0X3ZhbHVlKGlucHV0LCB2YWx1ZSkge1xuICAgIGlucHV0LnZhbHVlID0gdmFsdWUgPT0gbnVsbCA/ICcnIDogdmFsdWU7XG59XG5mdW5jdGlvbiBzZXRfaW5wdXRfdHlwZShpbnB1dCwgdHlwZSkge1xuICAgIHRyeSB7XG4gICAgICAgIGlucHV0LnR5cGUgPSB0eXBlO1xuICAgIH1cbiAgICBjYXRjaCAoZSkge1xuICAgICAgICAvLyBkbyBub3RoaW5nXG4gICAgfVxufVxuZnVuY3Rpb24gc2V0X3N0eWxlKG5vZGUsIGtleSwgdmFsdWUsIGltcG9ydGFudCkge1xuICAgIG5vZGUuc3R5bGUuc2V0UHJvcGVydHkoa2V5LCB2YWx1ZSwgaW1wb3J0YW50ID8gJ2ltcG9ydGFudCcgOiAnJyk7XG59XG5mdW5jdGlvbiBzZWxlY3Rfb3B0aW9uKHNlbGVjdCwgdmFsdWUpIHtcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IHNlbGVjdC5vcHRpb25zLmxlbmd0aDsgaSArPSAxKSB7XG4gICAgICAgIGNvbnN0IG9wdGlvbiA9IHNlbGVjdC5vcHRpb25zW2ldO1xuICAgICAgICBpZiAob3B0aW9uLl9fdmFsdWUgPT09IHZhbHVlKSB7XG4gICAgICAgICAgICBvcHRpb24uc2VsZWN0ZWQgPSB0cnVlO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgfVxufVxuZnVuY3Rpb24gc2VsZWN0X29wdGlvbnMoc2VsZWN0LCB2YWx1ZSkge1xuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgc2VsZWN0Lm9wdGlvbnMubGVuZ3RoOyBpICs9IDEpIHtcbiAgICAgICAgY29uc3Qgb3B0aW9uID0gc2VsZWN0Lm9wdGlvbnNbaV07XG4gICAgICAgIG9wdGlvbi5zZWxlY3RlZCA9IH52YWx1ZS5pbmRleE9mKG9wdGlvbi5fX3ZhbHVlKTtcbiAgICB9XG59XG5mdW5jdGlvbiBzZWxlY3RfdmFsdWUoc2VsZWN0KSB7XG4gICAgY29uc3Qgc2VsZWN0ZWRfb3B0aW9uID0gc2VsZWN0LnF1ZXJ5U2VsZWN0b3IoJzpjaGVja2VkJykgfHwgc2VsZWN0Lm9wdGlvbnNbMF07XG4gICAgcmV0dXJuIHNlbGVjdGVkX29wdGlvbiAmJiBzZWxlY3RlZF9vcHRpb24uX192YWx1ZTtcbn1cbmZ1bmN0aW9uIHNlbGVjdF9tdWx0aXBsZV92YWx1ZShzZWxlY3QpIHtcbiAgICByZXR1cm4gW10ubWFwLmNhbGwoc2VsZWN0LnF1ZXJ5U2VsZWN0b3JBbGwoJzpjaGVja2VkJyksIG9wdGlvbiA9PiBvcHRpb24uX192YWx1ZSk7XG59XG4vLyB1bmZvcnR1bmF0ZWx5IHRoaXMgY2FuJ3QgYmUgYSBjb25zdGFudCBhcyB0aGF0IHdvdWxkbid0IGJlIHRyZWUtc2hha2VhYmxlXG4vLyBzbyB3ZSBjYWNoZSB0aGUgcmVzdWx0IGluc3RlYWRcbmxldCBjcm9zc29yaWdpbjtcbmZ1bmN0aW9uIGlzX2Nyb3Nzb3JpZ2luKCkge1xuICAgIGlmIChjcm9zc29yaWdpbiA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIGNyb3Nzb3JpZ2luID0gZmFsc2U7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICBpZiAodHlwZW9mIHdpbmRvdyAhPT0gJ3VuZGVmaW5lZCcgJiYgd2luZG93LnBhcmVudCkge1xuICAgICAgICAgICAgICAgIHZvaWQgd2luZG93LnBhcmVudC5kb2N1bWVudDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgICAgIGNyb3Nzb3JpZ2luID0gdHJ1ZTtcbiAgICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gY3Jvc3NvcmlnaW47XG59XG5mdW5jdGlvbiBhZGRfcmVzaXplX2xpc3RlbmVyKG5vZGUsIGZuKSB7XG4gICAgY29uc3QgY29tcHV0ZWRfc3R5bGUgPSBnZXRDb21wdXRlZFN0eWxlKG5vZGUpO1xuICAgIGNvbnN0IHpfaW5kZXggPSAocGFyc2VJbnQoY29tcHV0ZWRfc3R5bGUuekluZGV4KSB8fCAwKSAtIDE7XG4gICAgaWYgKGNvbXB1dGVkX3N0eWxlLnBvc2l0aW9uID09PSAnc3RhdGljJykge1xuICAgICAgICBub2RlLnN0eWxlLnBvc2l0aW9uID0gJ3JlbGF0aXZlJztcbiAgICB9XG4gICAgY29uc3QgaWZyYW1lID0gZWxlbWVudCgnaWZyYW1lJyk7XG4gICAgaWZyYW1lLnNldEF0dHJpYnV0ZSgnc3R5bGUnLCBgZGlzcGxheTogYmxvY2s7IHBvc2l0aW9uOiBhYnNvbHV0ZTsgdG9wOiAwOyBsZWZ0OiAwOyB3aWR0aDogMTAwJTsgaGVpZ2h0OiAxMDAlOyBgICtcbiAgICAgICAgYG92ZXJmbG93OiBoaWRkZW47IGJvcmRlcjogMDsgb3BhY2l0eTogMDsgcG9pbnRlci1ldmVudHM6IG5vbmU7IHotaW5kZXg6ICR7el9pbmRleH07YCk7XG4gICAgaWZyYW1lLnNldEF0dHJpYnV0ZSgnYXJpYS1oaWRkZW4nLCAndHJ1ZScpO1xuICAgIGlmcmFtZS50YWJJbmRleCA9IC0xO1xuICAgIGNvbnN0IGNyb3Nzb3JpZ2luID0gaXNfY3Jvc3NvcmlnaW4oKTtcbiAgICBsZXQgdW5zdWJzY3JpYmU7XG4gICAgaWYgKGNyb3Nzb3JpZ2luKSB7XG4gICAgICAgIGlmcmFtZS5zcmMgPSBgZGF0YTp0ZXh0L2h0bWwsPHNjcmlwdD5vbnJlc2l6ZT1mdW5jdGlvbigpe3BhcmVudC5wb3N0TWVzc2FnZSgwLCcqJyl9PC9zY3JpcHQ+YDtcbiAgICAgICAgdW5zdWJzY3JpYmUgPSBsaXN0ZW4od2luZG93LCAnbWVzc2FnZScsIChldmVudCkgPT4ge1xuICAgICAgICAgICAgaWYgKGV2ZW50LnNvdXJjZSA9PT0gaWZyYW1lLmNvbnRlbnRXaW5kb3cpXG4gICAgICAgICAgICAgICAgZm4oKTtcbiAgICAgICAgfSk7XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgICBpZnJhbWUuc3JjID0gJ2Fib3V0OmJsYW5rJztcbiAgICAgICAgaWZyYW1lLm9ubG9hZCA9ICgpID0+IHtcbiAgICAgICAgICAgIHVuc3Vic2NyaWJlID0gbGlzdGVuKGlmcmFtZS5jb250ZW50V2luZG93LCAncmVzaXplJywgZm4pO1xuICAgICAgICB9O1xuICAgIH1cbiAgICBhcHBlbmQobm9kZSwgaWZyYW1lKTtcbiAgICByZXR1cm4gKCkgPT4ge1xuICAgICAgICBpZiAoY3Jvc3NvcmlnaW4pIHtcbiAgICAgICAgICAgIHVuc3Vic2NyaWJlKCk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSBpZiAodW5zdWJzY3JpYmUgJiYgaWZyYW1lLmNvbnRlbnRXaW5kb3cpIHtcbiAgICAgICAgICAgIHVuc3Vic2NyaWJlKCk7XG4gICAgICAgIH1cbiAgICAgICAgZGV0YWNoKGlmcmFtZSk7XG4gICAgfTtcbn1cbmZ1bmN0aW9uIHRvZ2dsZV9jbGFzcyhlbGVtZW50LCBuYW1lLCB0b2dnbGUpIHtcbiAgICBlbGVtZW50LmNsYXNzTGlzdFt0b2dnbGUgPyAnYWRkJyA6ICdyZW1vdmUnXShuYW1lKTtcbn1cbmZ1bmN0aW9uIGN1c3RvbV9ldmVudCh0eXBlLCBkZXRhaWwpIHtcbiAgICBjb25zdCBlID0gZG9jdW1lbnQuY3JlYXRlRXZlbnQoJ0N1c3RvbUV2ZW50Jyk7XG4gICAgZS5pbml0Q3VzdG9tRXZlbnQodHlwZSwgZmFsc2UsIGZhbHNlLCBkZXRhaWwpO1xuICAgIHJldHVybiBlO1xufVxuZnVuY3Rpb24gcXVlcnlfc2VsZWN0b3JfYWxsKHNlbGVjdG9yLCBwYXJlbnQgPSBkb2N1bWVudC5ib2R5KSB7XG4gICAgcmV0dXJuIEFycmF5LmZyb20ocGFyZW50LnF1ZXJ5U2VsZWN0b3JBbGwoc2VsZWN0b3IpKTtcbn1cbmNsYXNzIEh0bWxUYWcge1xuICAgIGNvbnN0cnVjdG9yKGFuY2hvciA9IG51bGwpIHtcbiAgICAgICAgdGhpcy5hID0gYW5jaG9yO1xuICAgICAgICB0aGlzLmUgPSB0aGlzLm4gPSBudWxsO1xuICAgIH1cbiAgICBtKGh0bWwsIHRhcmdldCwgYW5jaG9yID0gbnVsbCkge1xuICAgICAgICBpZiAoIXRoaXMuZSkge1xuICAgICAgICAgICAgdGhpcy5lID0gZWxlbWVudCh0YXJnZXQubm9kZU5hbWUpO1xuICAgICAgICAgICAgdGhpcy50ID0gdGFyZ2V0O1xuICAgICAgICAgICAgdGhpcy5oKGh0bWwpO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMuaShhbmNob3IpO1xuICAgIH1cbiAgICBoKGh0bWwpIHtcbiAgICAgICAgdGhpcy5lLmlubmVySFRNTCA9IGh0bWw7XG4gICAgICAgIHRoaXMubiA9IEFycmF5LmZyb20odGhpcy5lLmNoaWxkTm9kZXMpO1xuICAgIH1cbiAgICBpKGFuY2hvcikge1xuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IHRoaXMubi5sZW5ndGg7IGkgKz0gMSkge1xuICAgICAgICAgICAgaW5zZXJ0KHRoaXMudCwgdGhpcy5uW2ldLCBhbmNob3IpO1xuICAgICAgICB9XG4gICAgfVxuICAgIHAoaHRtbCkge1xuICAgICAgICB0aGlzLmQoKTtcbiAgICAgICAgdGhpcy5oKGh0bWwpO1xuICAgICAgICB0aGlzLmkodGhpcy5hKTtcbiAgICB9XG4gICAgZCgpIHtcbiAgICAgICAgdGhpcy5uLmZvckVhY2goZGV0YWNoKTtcbiAgICB9XG59XG5cbmNvbnN0IGFjdGl2ZV9kb2NzID0gbmV3IFNldCgpO1xubGV0IGFjdGl2ZSA9IDA7XG4vLyBodHRwczovL2dpdGh1Yi5jb20vZGFya3NreWFwcC9zdHJpbmctaGFzaC9ibG9iL21hc3Rlci9pbmRleC5qc1xuZnVuY3Rpb24gaGFzaChzdHIpIHtcbiAgICBsZXQgaGFzaCA9IDUzODE7XG4gICAgbGV0IGkgPSBzdHIubGVuZ3RoO1xuICAgIHdoaWxlIChpLS0pXG4gICAgICAgIGhhc2ggPSAoKGhhc2ggPDwgNSkgLSBoYXNoKSBeIHN0ci5jaGFyQ29kZUF0KGkpO1xuICAgIHJldHVybiBoYXNoID4+PiAwO1xufVxuZnVuY3Rpb24gY3JlYXRlX3J1bGUobm9kZSwgYSwgYiwgZHVyYXRpb24sIGRlbGF5LCBlYXNlLCBmbiwgdWlkID0gMCkge1xuICAgIGNvbnN0IHN0ZXAgPSAxNi42NjYgLyBkdXJhdGlvbjtcbiAgICBsZXQga2V5ZnJhbWVzID0gJ3tcXG4nO1xuICAgIGZvciAobGV0IHAgPSAwOyBwIDw9IDE7IHAgKz0gc3RlcCkge1xuICAgICAgICBjb25zdCB0ID0gYSArIChiIC0gYSkgKiBlYXNlKHApO1xuICAgICAgICBrZXlmcmFtZXMgKz0gcCAqIDEwMCArIGAleyR7Zm4odCwgMSAtIHQpfX1cXG5gO1xuICAgIH1cbiAgICBjb25zdCBydWxlID0ga2V5ZnJhbWVzICsgYDEwMCUgeyR7Zm4oYiwgMSAtIGIpfX1cXG59YDtcbiAgICBjb25zdCBuYW1lID0gYF9fc3ZlbHRlXyR7aGFzaChydWxlKX1fJHt1aWR9YDtcbiAgICBjb25zdCBkb2MgPSBub2RlLm93bmVyRG9jdW1lbnQ7XG4gICAgYWN0aXZlX2RvY3MuYWRkKGRvYyk7XG4gICAgY29uc3Qgc3R5bGVzaGVldCA9IGRvYy5fX3N2ZWx0ZV9zdHlsZXNoZWV0IHx8IChkb2MuX19zdmVsdGVfc3R5bGVzaGVldCA9IGRvYy5oZWFkLmFwcGVuZENoaWxkKGVsZW1lbnQoJ3N0eWxlJykpLnNoZWV0KTtcbiAgICBjb25zdCBjdXJyZW50X3J1bGVzID0gZG9jLl9fc3ZlbHRlX3J1bGVzIHx8IChkb2MuX19zdmVsdGVfcnVsZXMgPSB7fSk7XG4gICAgaWYgKCFjdXJyZW50X3J1bGVzW25hbWVdKSB7XG4gICAgICAgIGN1cnJlbnRfcnVsZXNbbmFtZV0gPSB0cnVlO1xuICAgICAgICBzdHlsZXNoZWV0Lmluc2VydFJ1bGUoYEBrZXlmcmFtZXMgJHtuYW1lfSAke3J1bGV9YCwgc3R5bGVzaGVldC5jc3NSdWxlcy5sZW5ndGgpO1xuICAgIH1cbiAgICBjb25zdCBhbmltYXRpb24gPSBub2RlLnN0eWxlLmFuaW1hdGlvbiB8fCAnJztcbiAgICBub2RlLnN0eWxlLmFuaW1hdGlvbiA9IGAke2FuaW1hdGlvbiA/IGAke2FuaW1hdGlvbn0sIGAgOiBgYH0ke25hbWV9ICR7ZHVyYXRpb259bXMgbGluZWFyICR7ZGVsYXl9bXMgMSBib3RoYDtcbiAgICBhY3RpdmUgKz0gMTtcbiAgICByZXR1cm4gbmFtZTtcbn1cbmZ1bmN0aW9uIGRlbGV0ZV9ydWxlKG5vZGUsIG5hbWUpIHtcbiAgICBjb25zdCBwcmV2aW91cyA9IChub2RlLnN0eWxlLmFuaW1hdGlvbiB8fCAnJykuc3BsaXQoJywgJyk7XG4gICAgY29uc3QgbmV4dCA9IHByZXZpb3VzLmZpbHRlcihuYW1lXG4gICAgICAgID8gYW5pbSA9PiBhbmltLmluZGV4T2YobmFtZSkgPCAwIC8vIHJlbW92ZSBzcGVjaWZpYyBhbmltYXRpb25cbiAgICAgICAgOiBhbmltID0+IGFuaW0uaW5kZXhPZignX19zdmVsdGUnKSA9PT0gLTEgLy8gcmVtb3ZlIGFsbCBTdmVsdGUgYW5pbWF0aW9uc1xuICAgICk7XG4gICAgY29uc3QgZGVsZXRlZCA9IHByZXZpb3VzLmxlbmd0aCAtIG5leHQubGVuZ3RoO1xuICAgIGlmIChkZWxldGVkKSB7XG4gICAgICAgIG5vZGUuc3R5bGUuYW5pbWF0aW9uID0gbmV4dC5qb2luKCcsICcpO1xuICAgICAgICBhY3RpdmUgLT0gZGVsZXRlZDtcbiAgICAgICAgaWYgKCFhY3RpdmUpXG4gICAgICAgICAgICBjbGVhcl9ydWxlcygpO1xuICAgIH1cbn1cbmZ1bmN0aW9uIGNsZWFyX3J1bGVzKCkge1xuICAgIHJhZigoKSA9PiB7XG4gICAgICAgIGlmIChhY3RpdmUpXG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIGFjdGl2ZV9kb2NzLmZvckVhY2goZG9jID0+IHtcbiAgICAgICAgICAgIGNvbnN0IHN0eWxlc2hlZXQgPSBkb2MuX19zdmVsdGVfc3R5bGVzaGVldDtcbiAgICAgICAgICAgIGxldCBpID0gc3R5bGVzaGVldC5jc3NSdWxlcy5sZW5ndGg7XG4gICAgICAgICAgICB3aGlsZSAoaS0tKVxuICAgICAgICAgICAgICAgIHN0eWxlc2hlZXQuZGVsZXRlUnVsZShpKTtcbiAgICAgICAgICAgIGRvYy5fX3N2ZWx0ZV9ydWxlcyA9IHt9O1xuICAgICAgICB9KTtcbiAgICAgICAgYWN0aXZlX2RvY3MuY2xlYXIoKTtcbiAgICB9KTtcbn1cblxuZnVuY3Rpb24gY3JlYXRlX2FuaW1hdGlvbihub2RlLCBmcm9tLCBmbiwgcGFyYW1zKSB7XG4gICAgaWYgKCFmcm9tKVxuICAgICAgICByZXR1cm4gbm9vcDtcbiAgICBjb25zdCB0byA9IG5vZGUuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCk7XG4gICAgaWYgKGZyb20ubGVmdCA9PT0gdG8ubGVmdCAmJiBmcm9tLnJpZ2h0ID09PSB0by5yaWdodCAmJiBmcm9tLnRvcCA9PT0gdG8udG9wICYmIGZyb20uYm90dG9tID09PSB0by5ib3R0b20pXG4gICAgICAgIHJldHVybiBub29wO1xuICAgIGNvbnN0IHsgZGVsYXkgPSAwLCBkdXJhdGlvbiA9IDMwMCwgZWFzaW5nID0gaWRlbnRpdHksIFxuICAgIC8vIEB0cy1pZ25vcmUgdG9kbzogc2hvdWxkIHRoaXMgYmUgc2VwYXJhdGVkIGZyb20gZGVzdHJ1Y3R1cmluZz8gT3Igc3RhcnQvZW5kIGFkZGVkIHRvIHB1YmxpYyBhcGkgYW5kIGRvY3VtZW50YXRpb24/XG4gICAgc3RhcnQ6IHN0YXJ0X3RpbWUgPSBub3coKSArIGRlbGF5LCBcbiAgICAvLyBAdHMtaWdub3JlIHRvZG86XG4gICAgZW5kID0gc3RhcnRfdGltZSArIGR1cmF0aW9uLCB0aWNrID0gbm9vcCwgY3NzIH0gPSBmbihub2RlLCB7IGZyb20sIHRvIH0sIHBhcmFtcyk7XG4gICAgbGV0IHJ1bm5pbmcgPSB0cnVlO1xuICAgIGxldCBzdGFydGVkID0gZmFsc2U7XG4gICAgbGV0IG5hbWU7XG4gICAgZnVuY3Rpb24gc3RhcnQoKSB7XG4gICAgICAgIGlmIChjc3MpIHtcbiAgICAgICAgICAgIG5hbWUgPSBjcmVhdGVfcnVsZShub2RlLCAwLCAxLCBkdXJhdGlvbiwgZGVsYXksIGVhc2luZywgY3NzKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoIWRlbGF5KSB7XG4gICAgICAgICAgICBzdGFydGVkID0gdHJ1ZTtcbiAgICAgICAgfVxuICAgIH1cbiAgICBmdW5jdGlvbiBzdG9wKCkge1xuICAgICAgICBpZiAoY3NzKVxuICAgICAgICAgICAgZGVsZXRlX3J1bGUobm9kZSwgbmFtZSk7XG4gICAgICAgIHJ1bm5pbmcgPSBmYWxzZTtcbiAgICB9XG4gICAgbG9vcChub3cgPT4ge1xuICAgICAgICBpZiAoIXN0YXJ0ZWQgJiYgbm93ID49IHN0YXJ0X3RpbWUpIHtcbiAgICAgICAgICAgIHN0YXJ0ZWQgPSB0cnVlO1xuICAgICAgICB9XG4gICAgICAgIGlmIChzdGFydGVkICYmIG5vdyA+PSBlbmQpIHtcbiAgICAgICAgICAgIHRpY2soMSwgMCk7XG4gICAgICAgICAgICBzdG9wKCk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKCFydW5uaW5nKSB7XG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHN0YXJ0ZWQpIHtcbiAgICAgICAgICAgIGNvbnN0IHAgPSBub3cgLSBzdGFydF90aW1lO1xuICAgICAgICAgICAgY29uc3QgdCA9IDAgKyAxICogZWFzaW5nKHAgLyBkdXJhdGlvbik7XG4gICAgICAgICAgICB0aWNrKHQsIDEgLSB0KTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9KTtcbiAgICBzdGFydCgpO1xuICAgIHRpY2soMCwgMSk7XG4gICAgcmV0dXJuIHN0b3A7XG59XG5mdW5jdGlvbiBmaXhfcG9zaXRpb24obm9kZSkge1xuICAgIGNvbnN0IHN0eWxlID0gZ2V0Q29tcHV0ZWRTdHlsZShub2RlKTtcbiAgICBpZiAoc3R5bGUucG9zaXRpb24gIT09ICdhYnNvbHV0ZScgJiYgc3R5bGUucG9zaXRpb24gIT09ICdmaXhlZCcpIHtcbiAgICAgICAgY29uc3QgeyB3aWR0aCwgaGVpZ2h0IH0gPSBzdHlsZTtcbiAgICAgICAgY29uc3QgYSA9IG5vZGUuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCk7XG4gICAgICAgIG5vZGUuc3R5bGUucG9zaXRpb24gPSAnYWJzb2x1dGUnO1xuICAgICAgICBub2RlLnN0eWxlLndpZHRoID0gd2lkdGg7XG4gICAgICAgIG5vZGUuc3R5bGUuaGVpZ2h0ID0gaGVpZ2h0O1xuICAgICAgICBhZGRfdHJhbnNmb3JtKG5vZGUsIGEpO1xuICAgIH1cbn1cbmZ1bmN0aW9uIGFkZF90cmFuc2Zvcm0obm9kZSwgYSkge1xuICAgIGNvbnN0IGIgPSBub2RlLmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpO1xuICAgIGlmIChhLmxlZnQgIT09IGIubGVmdCB8fCBhLnRvcCAhPT0gYi50b3ApIHtcbiAgICAgICAgY29uc3Qgc3R5bGUgPSBnZXRDb21wdXRlZFN0eWxlKG5vZGUpO1xuICAgICAgICBjb25zdCB0cmFuc2Zvcm0gPSBzdHlsZS50cmFuc2Zvcm0gPT09ICdub25lJyA/ICcnIDogc3R5bGUudHJhbnNmb3JtO1xuICAgICAgICBub2RlLnN0eWxlLnRyYW5zZm9ybSA9IGAke3RyYW5zZm9ybX0gdHJhbnNsYXRlKCR7YS5sZWZ0IC0gYi5sZWZ0fXB4LCAke2EudG9wIC0gYi50b3B9cHgpYDtcbiAgICB9XG59XG5cbmxldCBjdXJyZW50X2NvbXBvbmVudDtcbmZ1bmN0aW9uIHNldF9jdXJyZW50X2NvbXBvbmVudChjb21wb25lbnQpIHtcbiAgICBjdXJyZW50X2NvbXBvbmVudCA9IGNvbXBvbmVudDtcbn1cbmZ1bmN0aW9uIGdldF9jdXJyZW50X2NvbXBvbmVudCgpIHtcbiAgICBpZiAoIWN1cnJlbnRfY29tcG9uZW50KVxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYEZ1bmN0aW9uIGNhbGxlZCBvdXRzaWRlIGNvbXBvbmVudCBpbml0aWFsaXphdGlvbmApO1xuICAgIHJldHVybiBjdXJyZW50X2NvbXBvbmVudDtcbn1cbmZ1bmN0aW9uIGJlZm9yZVVwZGF0ZShmbikge1xuICAgIGdldF9jdXJyZW50X2NvbXBvbmVudCgpLiQkLmJlZm9yZV91cGRhdGUucHVzaChmbik7XG59XG5mdW5jdGlvbiBvbk1vdW50KGZuKSB7XG4gICAgZ2V0X2N1cnJlbnRfY29tcG9uZW50KCkuJCQub25fbW91bnQucHVzaChmbik7XG59XG5mdW5jdGlvbiBhZnRlclVwZGF0ZShmbikge1xuICAgIGdldF9jdXJyZW50X2NvbXBvbmVudCgpLiQkLmFmdGVyX3VwZGF0ZS5wdXNoKGZuKTtcbn1cbmZ1bmN0aW9uIG9uRGVzdHJveShmbikge1xuICAgIGdldF9jdXJyZW50X2NvbXBvbmVudCgpLiQkLm9uX2Rlc3Ryb3kucHVzaChmbik7XG59XG5mdW5jdGlvbiBjcmVhdGVFdmVudERpc3BhdGNoZXIoKSB7XG4gICAgY29uc3QgY29tcG9uZW50ID0gZ2V0X2N1cnJlbnRfY29tcG9uZW50KCk7XG4gICAgcmV0dXJuICh0eXBlLCBkZXRhaWwpID0+IHtcbiAgICAgICAgY29uc3QgY2FsbGJhY2tzID0gY29tcG9uZW50LiQkLmNhbGxiYWNrc1t0eXBlXTtcbiAgICAgICAgaWYgKGNhbGxiYWNrcykge1xuICAgICAgICAgICAgLy8gVE9ETyBhcmUgdGhlcmUgc2l0dWF0aW9ucyB3aGVyZSBldmVudHMgY291bGQgYmUgZGlzcGF0Y2hlZFxuICAgICAgICAgICAgLy8gaW4gYSBzZXJ2ZXIgKG5vbi1ET00pIGVudmlyb25tZW50P1xuICAgICAgICAgICAgY29uc3QgZXZlbnQgPSBjdXN0b21fZXZlbnQodHlwZSwgZGV0YWlsKTtcbiAgICAgICAgICAgIGNhbGxiYWNrcy5zbGljZSgpLmZvckVhY2goZm4gPT4ge1xuICAgICAgICAgICAgICAgIGZuLmNhbGwoY29tcG9uZW50LCBldmVudCk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgIH07XG59XG5mdW5jdGlvbiBzZXRDb250ZXh0KGtleSwgY29udGV4dCkge1xuICAgIGdldF9jdXJyZW50X2NvbXBvbmVudCgpLiQkLmNvbnRleHQuc2V0KGtleSwgY29udGV4dCk7XG59XG5mdW5jdGlvbiBnZXRDb250ZXh0KGtleSkge1xuICAgIHJldHVybiBnZXRfY3VycmVudF9jb21wb25lbnQoKS4kJC5jb250ZXh0LmdldChrZXkpO1xufVxuLy8gVE9ETyBmaWd1cmUgb3V0IGlmIHdlIHN0aWxsIHdhbnQgdG8gc3VwcG9ydFxuLy8gc2hvcnRoYW5kIGV2ZW50cywgb3IgaWYgd2Ugd2FudCB0byBpbXBsZW1lbnRcbi8vIGEgcmVhbCBidWJibGluZyBtZWNoYW5pc21cbmZ1bmN0aW9uIGJ1YmJsZShjb21wb25lbnQsIGV2ZW50KSB7XG4gICAgY29uc3QgY2FsbGJhY2tzID0gY29tcG9uZW50LiQkLmNhbGxiYWNrc1tldmVudC50eXBlXTtcbiAgICBpZiAoY2FsbGJhY2tzKSB7XG4gICAgICAgIGNhbGxiYWNrcy5zbGljZSgpLmZvckVhY2goZm4gPT4gZm4oZXZlbnQpKTtcbiAgICB9XG59XG5cbmNvbnN0IGRpcnR5X2NvbXBvbmVudHMgPSBbXTtcbmNvbnN0IGludHJvcyA9IHsgZW5hYmxlZDogZmFsc2UgfTtcbmNvbnN0IGJpbmRpbmdfY2FsbGJhY2tzID0gW107XG5jb25zdCByZW5kZXJfY2FsbGJhY2tzID0gW107XG5jb25zdCBmbHVzaF9jYWxsYmFja3MgPSBbXTtcbmNvbnN0IHJlc29sdmVkX3Byb21pc2UgPSBQcm9taXNlLnJlc29sdmUoKTtcbmxldCB1cGRhdGVfc2NoZWR1bGVkID0gZmFsc2U7XG5mdW5jdGlvbiBzY2hlZHVsZV91cGRhdGUoKSB7XG4gICAgaWYgKCF1cGRhdGVfc2NoZWR1bGVkKSB7XG4gICAgICAgIHVwZGF0ZV9zY2hlZHVsZWQgPSB0cnVlO1xuICAgICAgICByZXNvbHZlZF9wcm9taXNlLnRoZW4oZmx1c2gpO1xuICAgIH1cbn1cbmZ1bmN0aW9uIHRpY2soKSB7XG4gICAgc2NoZWR1bGVfdXBkYXRlKCk7XG4gICAgcmV0dXJuIHJlc29sdmVkX3Byb21pc2U7XG59XG5mdW5jdGlvbiBhZGRfcmVuZGVyX2NhbGxiYWNrKGZuKSB7XG4gICAgcmVuZGVyX2NhbGxiYWNrcy5wdXNoKGZuKTtcbn1cbmZ1bmN0aW9uIGFkZF9mbHVzaF9jYWxsYmFjayhmbikge1xuICAgIGZsdXNoX2NhbGxiYWNrcy5wdXNoKGZuKTtcbn1cbmxldCBmbHVzaGluZyA9IGZhbHNlO1xuY29uc3Qgc2Vlbl9jYWxsYmFja3MgPSBuZXcgU2V0KCk7XG5mdW5jdGlvbiBmbHVzaCgpIHtcbiAgICBpZiAoZmx1c2hpbmcpXG4gICAgICAgIHJldHVybjtcbiAgICBmbHVzaGluZyA9IHRydWU7XG4gICAgZG8ge1xuICAgICAgICAvLyBmaXJzdCwgY2FsbCBiZWZvcmVVcGRhdGUgZnVuY3Rpb25zXG4gICAgICAgIC8vIGFuZCB1cGRhdGUgY29tcG9uZW50c1xuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IGRpcnR5X2NvbXBvbmVudHMubGVuZ3RoOyBpICs9IDEpIHtcbiAgICAgICAgICAgIGNvbnN0IGNvbXBvbmVudCA9IGRpcnR5X2NvbXBvbmVudHNbaV07XG4gICAgICAgICAgICBzZXRfY3VycmVudF9jb21wb25lbnQoY29tcG9uZW50KTtcbiAgICAgICAgICAgIHVwZGF0ZShjb21wb25lbnQuJCQpO1xuICAgICAgICB9XG4gICAgICAgIGRpcnR5X2NvbXBvbmVudHMubGVuZ3RoID0gMDtcbiAgICAgICAgd2hpbGUgKGJpbmRpbmdfY2FsbGJhY2tzLmxlbmd0aClcbiAgICAgICAgICAgIGJpbmRpbmdfY2FsbGJhY2tzLnBvcCgpKCk7XG4gICAgICAgIC8vIHRoZW4sIG9uY2UgY29tcG9uZW50cyBhcmUgdXBkYXRlZCwgY2FsbFxuICAgICAgICAvLyBhZnRlclVwZGF0ZSBmdW5jdGlvbnMuIFRoaXMgbWF5IGNhdXNlXG4gICAgICAgIC8vIHN1YnNlcXVlbnQgdXBkYXRlcy4uLlxuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IHJlbmRlcl9jYWxsYmFja3MubGVuZ3RoOyBpICs9IDEpIHtcbiAgICAgICAgICAgIGNvbnN0IGNhbGxiYWNrID0gcmVuZGVyX2NhbGxiYWNrc1tpXTtcbiAgICAgICAgICAgIGlmICghc2Vlbl9jYWxsYmFja3MuaGFzKGNhbGxiYWNrKSkge1xuICAgICAgICAgICAgICAgIC8vIC4uLnNvIGd1YXJkIGFnYWluc3QgaW5maW5pdGUgbG9vcHNcbiAgICAgICAgICAgICAgICBzZWVuX2NhbGxiYWNrcy5hZGQoY2FsbGJhY2spO1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmVuZGVyX2NhbGxiYWNrcy5sZW5ndGggPSAwO1xuICAgIH0gd2hpbGUgKGRpcnR5X2NvbXBvbmVudHMubGVuZ3RoKTtcbiAgICB3aGlsZSAoZmx1c2hfY2FsbGJhY2tzLmxlbmd0aCkge1xuICAgICAgICBmbHVzaF9jYWxsYmFja3MucG9wKCkoKTtcbiAgICB9XG4gICAgdXBkYXRlX3NjaGVkdWxlZCA9IGZhbHNlO1xuICAgIGZsdXNoaW5nID0gZmFsc2U7XG4gICAgc2Vlbl9jYWxsYmFja3MuY2xlYXIoKTtcbn1cbmZ1bmN0aW9uIHVwZGF0ZSgkJCkge1xuICAgIGlmICgkJC5mcmFnbWVudCAhPT0gbnVsbCkge1xuICAgICAgICAkJC51cGRhdGUoKTtcbiAgICAgICAgcnVuX2FsbCgkJC5iZWZvcmVfdXBkYXRlKTtcbiAgICAgICAgY29uc3QgZGlydHkgPSAkJC5kaXJ0eTtcbiAgICAgICAgJCQuZGlydHkgPSBbLTFdO1xuICAgICAgICAkJC5mcmFnbWVudCAmJiAkJC5mcmFnbWVudC5wKCQkLmN0eCwgZGlydHkpO1xuICAgICAgICAkJC5hZnRlcl91cGRhdGUuZm9yRWFjaChhZGRfcmVuZGVyX2NhbGxiYWNrKTtcbiAgICB9XG59XG5cbmxldCBwcm9taXNlO1xuZnVuY3Rpb24gd2FpdCgpIHtcbiAgICBpZiAoIXByb21pc2UpIHtcbiAgICAgICAgcHJvbWlzZSA9IFByb21pc2UucmVzb2x2ZSgpO1xuICAgICAgICBwcm9taXNlLnRoZW4oKCkgPT4ge1xuICAgICAgICAgICAgcHJvbWlzZSA9IG51bGw7XG4gICAgICAgIH0pO1xuICAgIH1cbiAgICByZXR1cm4gcHJvbWlzZTtcbn1cbmZ1bmN0aW9uIGRpc3BhdGNoKG5vZGUsIGRpcmVjdGlvbiwga2luZCkge1xuICAgIG5vZGUuZGlzcGF0Y2hFdmVudChjdXN0b21fZXZlbnQoYCR7ZGlyZWN0aW9uID8gJ2ludHJvJyA6ICdvdXRybyd9JHtraW5kfWApKTtcbn1cbmNvbnN0IG91dHJvaW5nID0gbmV3IFNldCgpO1xubGV0IG91dHJvcztcbmZ1bmN0aW9uIGdyb3VwX291dHJvcygpIHtcbiAgICBvdXRyb3MgPSB7XG4gICAgICAgIHI6IDAsXG4gICAgICAgIGM6IFtdLFxuICAgICAgICBwOiBvdXRyb3MgLy8gcGFyZW50IGdyb3VwXG4gICAgfTtcbn1cbmZ1bmN0aW9uIGNoZWNrX291dHJvcygpIHtcbiAgICBpZiAoIW91dHJvcy5yKSB7XG4gICAgICAgIHJ1bl9hbGwob3V0cm9zLmMpO1xuICAgIH1cbiAgICBvdXRyb3MgPSBvdXRyb3MucDtcbn1cbmZ1bmN0aW9uIHRyYW5zaXRpb25faW4oYmxvY2ssIGxvY2FsKSB7XG4gICAgaWYgKGJsb2NrICYmIGJsb2NrLmkpIHtcbiAgICAgICAgb3V0cm9pbmcuZGVsZXRlKGJsb2NrKTtcbiAgICAgICAgYmxvY2suaShsb2NhbCk7XG4gICAgfVxufVxuZnVuY3Rpb24gdHJhbnNpdGlvbl9vdXQoYmxvY2ssIGxvY2FsLCBkZXRhY2gsIGNhbGxiYWNrKSB7XG4gICAgaWYgKGJsb2NrICYmIGJsb2NrLm8pIHtcbiAgICAgICAgaWYgKG91dHJvaW5nLmhhcyhibG9jaykpXG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIG91dHJvaW5nLmFkZChibG9jayk7XG4gICAgICAgIG91dHJvcy5jLnB1c2goKCkgPT4ge1xuICAgICAgICAgICAgb3V0cm9pbmcuZGVsZXRlKGJsb2NrKTtcbiAgICAgICAgICAgIGlmIChjYWxsYmFjaykge1xuICAgICAgICAgICAgICAgIGlmIChkZXRhY2gpXG4gICAgICAgICAgICAgICAgICAgIGJsb2NrLmQoMSk7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2soKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIGJsb2NrLm8obG9jYWwpO1xuICAgIH1cbn1cbmNvbnN0IG51bGxfdHJhbnNpdGlvbiA9IHsgZHVyYXRpb246IDAgfTtcbmZ1bmN0aW9uIGNyZWF0ZV9pbl90cmFuc2l0aW9uKG5vZGUsIGZuLCBwYXJhbXMpIHtcbiAgICBsZXQgY29uZmlnID0gZm4obm9kZSwgcGFyYW1zKTtcbiAgICBsZXQgcnVubmluZyA9IGZhbHNlO1xuICAgIGxldCBhbmltYXRpb25fbmFtZTtcbiAgICBsZXQgdGFzaztcbiAgICBsZXQgdWlkID0gMDtcbiAgICBmdW5jdGlvbiBjbGVhbnVwKCkge1xuICAgICAgICBpZiAoYW5pbWF0aW9uX25hbWUpXG4gICAgICAgICAgICBkZWxldGVfcnVsZShub2RlLCBhbmltYXRpb25fbmFtZSk7XG4gICAgfVxuICAgIGZ1bmN0aW9uIGdvKCkge1xuICAgICAgICBjb25zdCB7IGRlbGF5ID0gMCwgZHVyYXRpb24gPSAzMDAsIGVhc2luZyA9IGlkZW50aXR5LCB0aWNrID0gbm9vcCwgY3NzIH0gPSBjb25maWcgfHwgbnVsbF90cmFuc2l0aW9uO1xuICAgICAgICBpZiAoY3NzKVxuICAgICAgICAgICAgYW5pbWF0aW9uX25hbWUgPSBjcmVhdGVfcnVsZShub2RlLCAwLCAxLCBkdXJhdGlvbiwgZGVsYXksIGVhc2luZywgY3NzLCB1aWQrKyk7XG4gICAgICAgIHRpY2soMCwgMSk7XG4gICAgICAgIGNvbnN0IHN0YXJ0X3RpbWUgPSBub3coKSArIGRlbGF5O1xuICAgICAgICBjb25zdCBlbmRfdGltZSA9IHN0YXJ0X3RpbWUgKyBkdXJhdGlvbjtcbiAgICAgICAgaWYgKHRhc2spXG4gICAgICAgICAgICB0YXNrLmFib3J0KCk7XG4gICAgICAgIHJ1bm5pbmcgPSB0cnVlO1xuICAgICAgICBhZGRfcmVuZGVyX2NhbGxiYWNrKCgpID0+IGRpc3BhdGNoKG5vZGUsIHRydWUsICdzdGFydCcpKTtcbiAgICAgICAgdGFzayA9IGxvb3Aobm93ID0+IHtcbiAgICAgICAgICAgIGlmIChydW5uaW5nKSB7XG4gICAgICAgICAgICAgICAgaWYgKG5vdyA+PSBlbmRfdGltZSkge1xuICAgICAgICAgICAgICAgICAgICB0aWNrKDEsIDApO1xuICAgICAgICAgICAgICAgICAgICBkaXNwYXRjaChub2RlLCB0cnVlLCAnZW5kJyk7XG4gICAgICAgICAgICAgICAgICAgIGNsZWFudXAoKTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHJ1bm5pbmcgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYgKG5vdyA+PSBzdGFydF90aW1lKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHQgPSBlYXNpbmcoKG5vdyAtIHN0YXJ0X3RpbWUpIC8gZHVyYXRpb24pO1xuICAgICAgICAgICAgICAgICAgICB0aWNrKHQsIDEgLSB0KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gcnVubmluZztcbiAgICAgICAgfSk7XG4gICAgfVxuICAgIGxldCBzdGFydGVkID0gZmFsc2U7XG4gICAgcmV0dXJuIHtcbiAgICAgICAgc3RhcnQoKSB7XG4gICAgICAgICAgICBpZiAoc3RhcnRlZClcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICBkZWxldGVfcnVsZShub2RlKTtcbiAgICAgICAgICAgIGlmIChpc19mdW5jdGlvbihjb25maWcpKSB7XG4gICAgICAgICAgICAgICAgY29uZmlnID0gY29uZmlnKCk7XG4gICAgICAgICAgICAgICAgd2FpdCgpLnRoZW4oZ28pO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgZ28oKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSxcbiAgICAgICAgaW52YWxpZGF0ZSgpIHtcbiAgICAgICAgICAgIHN0YXJ0ZWQgPSBmYWxzZTtcbiAgICAgICAgfSxcbiAgICAgICAgZW5kKCkge1xuICAgICAgICAgICAgaWYgKHJ1bm5pbmcpIHtcbiAgICAgICAgICAgICAgICBjbGVhbnVwKCk7XG4gICAgICAgICAgICAgICAgcnVubmluZyA9IGZhbHNlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfTtcbn1cbmZ1bmN0aW9uIGNyZWF0ZV9vdXRfdHJhbnNpdGlvbihub2RlLCBmbiwgcGFyYW1zKSB7XG4gICAgbGV0IGNvbmZpZyA9IGZuKG5vZGUsIHBhcmFtcyk7XG4gICAgbGV0IHJ1bm5pbmcgPSB0cnVlO1xuICAgIGxldCBhbmltYXRpb25fbmFtZTtcbiAgICBjb25zdCBncm91cCA9IG91dHJvcztcbiAgICBncm91cC5yICs9IDE7XG4gICAgZnVuY3Rpb24gZ28oKSB7XG4gICAgICAgIGNvbnN0IHsgZGVsYXkgPSAwLCBkdXJhdGlvbiA9IDMwMCwgZWFzaW5nID0gaWRlbnRpdHksIHRpY2sgPSBub29wLCBjc3MgfSA9IGNvbmZpZyB8fCBudWxsX3RyYW5zaXRpb247XG4gICAgICAgIGlmIChjc3MpXG4gICAgICAgICAgICBhbmltYXRpb25fbmFtZSA9IGNyZWF0ZV9ydWxlKG5vZGUsIDEsIDAsIGR1cmF0aW9uLCBkZWxheSwgZWFzaW5nLCBjc3MpO1xuICAgICAgICBjb25zdCBzdGFydF90aW1lID0gbm93KCkgKyBkZWxheTtcbiAgICAgICAgY29uc3QgZW5kX3RpbWUgPSBzdGFydF90aW1lICsgZHVyYXRpb247XG4gICAgICAgIGFkZF9yZW5kZXJfY2FsbGJhY2soKCkgPT4gZGlzcGF0Y2gobm9kZSwgZmFsc2UsICdzdGFydCcpKTtcbiAgICAgICAgbG9vcChub3cgPT4ge1xuICAgICAgICAgICAgaWYgKHJ1bm5pbmcpIHtcbiAgICAgICAgICAgICAgICBpZiAobm93ID49IGVuZF90aW1lKSB7XG4gICAgICAgICAgICAgICAgICAgIHRpY2soMCwgMSk7XG4gICAgICAgICAgICAgICAgICAgIGRpc3BhdGNoKG5vZGUsIGZhbHNlLCAnZW5kJyk7XG4gICAgICAgICAgICAgICAgICAgIGlmICghLS1ncm91cC5yKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyB0aGlzIHdpbGwgcmVzdWx0IGluIGBlbmQoKWAgYmVpbmcgY2FsbGVkLFxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gc28gd2UgZG9uJ3QgbmVlZCB0byBjbGVhbiB1cCBoZXJlXG4gICAgICAgICAgICAgICAgICAgICAgICBydW5fYWxsKGdyb3VwLmMpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYgKG5vdyA+PSBzdGFydF90aW1lKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHQgPSBlYXNpbmcoKG5vdyAtIHN0YXJ0X3RpbWUpIC8gZHVyYXRpb24pO1xuICAgICAgICAgICAgICAgICAgICB0aWNrKDEgLSB0LCB0KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gcnVubmluZztcbiAgICAgICAgfSk7XG4gICAgfVxuICAgIGlmIChpc19mdW5jdGlvbihjb25maWcpKSB7XG4gICAgICAgIHdhaXQoKS50aGVuKCgpID0+IHtcbiAgICAgICAgICAgIC8vIEB0cy1pZ25vcmVcbiAgICAgICAgICAgIGNvbmZpZyA9IGNvbmZpZygpO1xuICAgICAgICAgICAgZ28oKTtcbiAgICAgICAgfSk7XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgICBnbygpO1xuICAgIH1cbiAgICByZXR1cm4ge1xuICAgICAgICBlbmQocmVzZXQpIHtcbiAgICAgICAgICAgIGlmIChyZXNldCAmJiBjb25maWcudGljaykge1xuICAgICAgICAgICAgICAgIGNvbmZpZy50aWNrKDEsIDApO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKHJ1bm5pbmcpIHtcbiAgICAgICAgICAgICAgICBpZiAoYW5pbWF0aW9uX25hbWUpXG4gICAgICAgICAgICAgICAgICAgIGRlbGV0ZV9ydWxlKG5vZGUsIGFuaW1hdGlvbl9uYW1lKTtcbiAgICAgICAgICAgICAgICBydW5uaW5nID0gZmFsc2U7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9O1xufVxuZnVuY3Rpb24gY3JlYXRlX2JpZGlyZWN0aW9uYWxfdHJhbnNpdGlvbihub2RlLCBmbiwgcGFyYW1zLCBpbnRybykge1xuICAgIGxldCBjb25maWcgPSBmbihub2RlLCBwYXJhbXMpO1xuICAgIGxldCB0ID0gaW50cm8gPyAwIDogMTtcbiAgICBsZXQgcnVubmluZ19wcm9ncmFtID0gbnVsbDtcbiAgICBsZXQgcGVuZGluZ19wcm9ncmFtID0gbnVsbDtcbiAgICBsZXQgYW5pbWF0aW9uX25hbWUgPSBudWxsO1xuICAgIGZ1bmN0aW9uIGNsZWFyX2FuaW1hdGlvbigpIHtcbiAgICAgICAgaWYgKGFuaW1hdGlvbl9uYW1lKVxuICAgICAgICAgICAgZGVsZXRlX3J1bGUobm9kZSwgYW5pbWF0aW9uX25hbWUpO1xuICAgIH1cbiAgICBmdW5jdGlvbiBpbml0KHByb2dyYW0sIGR1cmF0aW9uKSB7XG4gICAgICAgIGNvbnN0IGQgPSBwcm9ncmFtLmIgLSB0O1xuICAgICAgICBkdXJhdGlvbiAqPSBNYXRoLmFicyhkKTtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIGE6IHQsXG4gICAgICAgICAgICBiOiBwcm9ncmFtLmIsXG4gICAgICAgICAgICBkLFxuICAgICAgICAgICAgZHVyYXRpb24sXG4gICAgICAgICAgICBzdGFydDogcHJvZ3JhbS5zdGFydCxcbiAgICAgICAgICAgIGVuZDogcHJvZ3JhbS5zdGFydCArIGR1cmF0aW9uLFxuICAgICAgICAgICAgZ3JvdXA6IHByb2dyYW0uZ3JvdXBcbiAgICAgICAgfTtcbiAgICB9XG4gICAgZnVuY3Rpb24gZ28oYikge1xuICAgICAgICBjb25zdCB7IGRlbGF5ID0gMCwgZHVyYXRpb24gPSAzMDAsIGVhc2luZyA9IGlkZW50aXR5LCB0aWNrID0gbm9vcCwgY3NzIH0gPSBjb25maWcgfHwgbnVsbF90cmFuc2l0aW9uO1xuICAgICAgICBjb25zdCBwcm9ncmFtID0ge1xuICAgICAgICAgICAgc3RhcnQ6IG5vdygpICsgZGVsYXksXG4gICAgICAgICAgICBiXG4gICAgICAgIH07XG4gICAgICAgIGlmICghYikge1xuICAgICAgICAgICAgLy8gQHRzLWlnbm9yZSB0b2RvOiBpbXByb3ZlIHR5cGluZ3NcbiAgICAgICAgICAgIHByb2dyYW0uZ3JvdXAgPSBvdXRyb3M7XG4gICAgICAgICAgICBvdXRyb3MuciArPSAxO1xuICAgICAgICB9XG4gICAgICAgIGlmIChydW5uaW5nX3Byb2dyYW0pIHtcbiAgICAgICAgICAgIHBlbmRpbmdfcHJvZ3JhbSA9IHByb2dyYW07XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAvLyBpZiB0aGlzIGlzIGFuIGludHJvLCBhbmQgdGhlcmUncyBhIGRlbGF5LCB3ZSBuZWVkIHRvIGRvXG4gICAgICAgICAgICAvLyBhbiBpbml0aWFsIHRpY2sgYW5kL29yIGFwcGx5IENTUyBhbmltYXRpb24gaW1tZWRpYXRlbHlcbiAgICAgICAgICAgIGlmIChjc3MpIHtcbiAgICAgICAgICAgICAgICBjbGVhcl9hbmltYXRpb24oKTtcbiAgICAgICAgICAgICAgICBhbmltYXRpb25fbmFtZSA9IGNyZWF0ZV9ydWxlKG5vZGUsIHQsIGIsIGR1cmF0aW9uLCBkZWxheSwgZWFzaW5nLCBjc3MpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKGIpXG4gICAgICAgICAgICAgICAgdGljaygwLCAxKTtcbiAgICAgICAgICAgIHJ1bm5pbmdfcHJvZ3JhbSA9IGluaXQocHJvZ3JhbSwgZHVyYXRpb24pO1xuICAgICAgICAgICAgYWRkX3JlbmRlcl9jYWxsYmFjaygoKSA9PiBkaXNwYXRjaChub2RlLCBiLCAnc3RhcnQnKSk7XG4gICAgICAgICAgICBsb29wKG5vdyA9PiB7XG4gICAgICAgICAgICAgICAgaWYgKHBlbmRpbmdfcHJvZ3JhbSAmJiBub3cgPiBwZW5kaW5nX3Byb2dyYW0uc3RhcnQpIHtcbiAgICAgICAgICAgICAgICAgICAgcnVubmluZ19wcm9ncmFtID0gaW5pdChwZW5kaW5nX3Byb2dyYW0sIGR1cmF0aW9uKTtcbiAgICAgICAgICAgICAgICAgICAgcGVuZGluZ19wcm9ncmFtID0gbnVsbDtcbiAgICAgICAgICAgICAgICAgICAgZGlzcGF0Y2gobm9kZSwgcnVubmluZ19wcm9ncmFtLmIsICdzdGFydCcpO1xuICAgICAgICAgICAgICAgICAgICBpZiAoY3NzKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjbGVhcl9hbmltYXRpb24oKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGFuaW1hdGlvbl9uYW1lID0gY3JlYXRlX3J1bGUobm9kZSwgdCwgcnVubmluZ19wcm9ncmFtLmIsIHJ1bm5pbmdfcHJvZ3JhbS5kdXJhdGlvbiwgMCwgZWFzaW5nLCBjb25maWcuY3NzKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZiAocnVubmluZ19wcm9ncmFtKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChub3cgPj0gcnVubmluZ19wcm9ncmFtLmVuZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGljayh0ID0gcnVubmluZ19wcm9ncmFtLmIsIDEgLSB0KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGRpc3BhdGNoKG5vZGUsIHJ1bm5pbmdfcHJvZ3JhbS5iLCAnZW5kJyk7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoIXBlbmRpbmdfcHJvZ3JhbSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIHdlJ3JlIGRvbmVcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAocnVubmluZ19wcm9ncmFtLmIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gaW50cm8g4oCUIHdlIGNhbiB0aWR5IHVwIGltbWVkaWF0ZWx5XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNsZWFyX2FuaW1hdGlvbigpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gb3V0cm8g4oCUIG5lZWRzIHRvIGJlIGNvb3JkaW5hdGVkXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICghLS1ydW5uaW5nX3Byb2dyYW0uZ3JvdXAucilcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJ1bl9hbGwocnVubmluZ19wcm9ncmFtLmdyb3VwLmMpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIHJ1bm5pbmdfcHJvZ3JhbSA9IG51bGw7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgZWxzZSBpZiAobm93ID49IHJ1bm5pbmdfcHJvZ3JhbS5zdGFydCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgcCA9IG5vdyAtIHJ1bm5pbmdfcHJvZ3JhbS5zdGFydDtcbiAgICAgICAgICAgICAgICAgICAgICAgIHQgPSBydW5uaW5nX3Byb2dyYW0uYSArIHJ1bm5pbmdfcHJvZ3JhbS5kICogZWFzaW5nKHAgLyBydW5uaW5nX3Byb2dyYW0uZHVyYXRpb24pO1xuICAgICAgICAgICAgICAgICAgICAgICAgdGljayh0LCAxIC0gdCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcmV0dXJuICEhKHJ1bm5pbmdfcHJvZ3JhbSB8fCBwZW5kaW5nX3Byb2dyYW0pO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHtcbiAgICAgICAgcnVuKGIpIHtcbiAgICAgICAgICAgIGlmIChpc19mdW5jdGlvbihjb25maWcpKSB7XG4gICAgICAgICAgICAgICAgd2FpdCgpLnRoZW4oKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAvLyBAdHMtaWdub3JlXG4gICAgICAgICAgICAgICAgICAgIGNvbmZpZyA9IGNvbmZpZygpO1xuICAgICAgICAgICAgICAgICAgICBnbyhiKTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgIGdvKGIpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9LFxuICAgICAgICBlbmQoKSB7XG4gICAgICAgICAgICBjbGVhcl9hbmltYXRpb24oKTtcbiAgICAgICAgICAgIHJ1bm5pbmdfcHJvZ3JhbSA9IHBlbmRpbmdfcHJvZ3JhbSA9IG51bGw7XG4gICAgICAgIH1cbiAgICB9O1xufVxuXG5mdW5jdGlvbiBoYW5kbGVfcHJvbWlzZShwcm9taXNlLCBpbmZvKSB7XG4gICAgY29uc3QgdG9rZW4gPSBpbmZvLnRva2VuID0ge307XG4gICAgZnVuY3Rpb24gdXBkYXRlKHR5cGUsIGluZGV4LCBrZXksIHZhbHVlKSB7XG4gICAgICAgIGlmIChpbmZvLnRva2VuICE9PSB0b2tlbilcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgaW5mby5yZXNvbHZlZCA9IHZhbHVlO1xuICAgICAgICBsZXQgY2hpbGRfY3R4ID0gaW5mby5jdHg7XG4gICAgICAgIGlmIChrZXkgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgY2hpbGRfY3R4ID0gY2hpbGRfY3R4LnNsaWNlKCk7XG4gICAgICAgICAgICBjaGlsZF9jdHhba2V5XSA9IHZhbHVlO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IGJsb2NrID0gdHlwZSAmJiAoaW5mby5jdXJyZW50ID0gdHlwZSkoY2hpbGRfY3R4KTtcbiAgICAgICAgbGV0IG5lZWRzX2ZsdXNoID0gZmFsc2U7XG4gICAgICAgIGlmIChpbmZvLmJsb2NrKSB7XG4gICAgICAgICAgICBpZiAoaW5mby5ibG9ja3MpIHtcbiAgICAgICAgICAgICAgICBpbmZvLmJsb2Nrcy5mb3JFYWNoKChibG9jaywgaSkgPT4ge1xuICAgICAgICAgICAgICAgICAgICBpZiAoaSAhPT0gaW5kZXggJiYgYmxvY2spIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGdyb3VwX291dHJvcygpO1xuICAgICAgICAgICAgICAgICAgICAgICAgdHJhbnNpdGlvbl9vdXQoYmxvY2ssIDEsIDEsICgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpbmZvLmJsb2Nrc1tpXSA9IG51bGw7XG4gICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNoZWNrX291dHJvcygpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICBpbmZvLmJsb2NrLmQoMSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBibG9jay5jKCk7XG4gICAgICAgICAgICB0cmFuc2l0aW9uX2luKGJsb2NrLCAxKTtcbiAgICAgICAgICAgIGJsb2NrLm0oaW5mby5tb3VudCgpLCBpbmZvLmFuY2hvcik7XG4gICAgICAgICAgICBuZWVkc19mbHVzaCA9IHRydWU7XG4gICAgICAgIH1cbiAgICAgICAgaW5mby5ibG9jayA9IGJsb2NrO1xuICAgICAgICBpZiAoaW5mby5ibG9ja3MpXG4gICAgICAgICAgICBpbmZvLmJsb2Nrc1tpbmRleF0gPSBibG9jaztcbiAgICAgICAgaWYgKG5lZWRzX2ZsdXNoKSB7XG4gICAgICAgICAgICBmbHVzaCgpO1xuICAgICAgICB9XG4gICAgfVxuICAgIGlmIChpc19wcm9taXNlKHByb21pc2UpKSB7XG4gICAgICAgIGNvbnN0IGN1cnJlbnRfY29tcG9uZW50ID0gZ2V0X2N1cnJlbnRfY29tcG9uZW50KCk7XG4gICAgICAgIHByb21pc2UudGhlbih2YWx1ZSA9PiB7XG4gICAgICAgICAgICBzZXRfY3VycmVudF9jb21wb25lbnQoY3VycmVudF9jb21wb25lbnQpO1xuICAgICAgICAgICAgdXBkYXRlKGluZm8udGhlbiwgMSwgaW5mby52YWx1ZSwgdmFsdWUpO1xuICAgICAgICAgICAgc2V0X2N1cnJlbnRfY29tcG9uZW50KG51bGwpO1xuICAgICAgICB9LCBlcnJvciA9PiB7XG4gICAgICAgICAgICBzZXRfY3VycmVudF9jb21wb25lbnQoY3VycmVudF9jb21wb25lbnQpO1xuICAgICAgICAgICAgdXBkYXRlKGluZm8uY2F0Y2gsIDIsIGluZm8uZXJyb3IsIGVycm9yKTtcbiAgICAgICAgICAgIHNldF9jdXJyZW50X2NvbXBvbmVudChudWxsKTtcbiAgICAgICAgfSk7XG4gICAgICAgIC8vIGlmIHdlIHByZXZpb3VzbHkgaGFkIGEgdGhlbi9jYXRjaCBibG9jaywgZGVzdHJveSBpdFxuICAgICAgICBpZiAoaW5mby5jdXJyZW50ICE9PSBpbmZvLnBlbmRpbmcpIHtcbiAgICAgICAgICAgIHVwZGF0ZShpbmZvLnBlbmRpbmcsIDApO1xuICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH1cbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICAgIGlmIChpbmZvLmN1cnJlbnQgIT09IGluZm8udGhlbikge1xuICAgICAgICAgICAgdXBkYXRlKGluZm8udGhlbiwgMSwgaW5mby52YWx1ZSwgcHJvbWlzZSk7XG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgfVxuICAgICAgICBpbmZvLnJlc29sdmVkID0gcHJvbWlzZTtcbiAgICB9XG59XG5cbmNvbnN0IGdsb2JhbHMgPSAodHlwZW9mIHdpbmRvdyAhPT0gJ3VuZGVmaW5lZCdcbiAgICA/IHdpbmRvd1xuICAgIDogdHlwZW9mIGdsb2JhbFRoaXMgIT09ICd1bmRlZmluZWQnXG4gICAgICAgID8gZ2xvYmFsVGhpc1xuICAgICAgICA6IGdsb2JhbCk7XG5cbmZ1bmN0aW9uIGRlc3Ryb3lfYmxvY2soYmxvY2ssIGxvb2t1cCkge1xuICAgIGJsb2NrLmQoMSk7XG4gICAgbG9va3VwLmRlbGV0ZShibG9jay5rZXkpO1xufVxuZnVuY3Rpb24gb3V0cm9fYW5kX2Rlc3Ryb3lfYmxvY2soYmxvY2ssIGxvb2t1cCkge1xuICAgIHRyYW5zaXRpb25fb3V0KGJsb2NrLCAxLCAxLCAoKSA9PiB7XG4gICAgICAgIGxvb2t1cC5kZWxldGUoYmxvY2sua2V5KTtcbiAgICB9KTtcbn1cbmZ1bmN0aW9uIGZpeF9hbmRfZGVzdHJveV9ibG9jayhibG9jaywgbG9va3VwKSB7XG4gICAgYmxvY2suZigpO1xuICAgIGRlc3Ryb3lfYmxvY2soYmxvY2ssIGxvb2t1cCk7XG59XG5mdW5jdGlvbiBmaXhfYW5kX291dHJvX2FuZF9kZXN0cm95X2Jsb2NrKGJsb2NrLCBsb29rdXApIHtcbiAgICBibG9jay5mKCk7XG4gICAgb3V0cm9fYW5kX2Rlc3Ryb3lfYmxvY2soYmxvY2ssIGxvb2t1cCk7XG59XG5mdW5jdGlvbiB1cGRhdGVfa2V5ZWRfZWFjaChvbGRfYmxvY2tzLCBkaXJ0eSwgZ2V0X2tleSwgZHluYW1pYywgY3R4LCBsaXN0LCBsb29rdXAsIG5vZGUsIGRlc3Ryb3ksIGNyZWF0ZV9lYWNoX2Jsb2NrLCBuZXh0LCBnZXRfY29udGV4dCkge1xuICAgIGxldCBvID0gb2xkX2Jsb2Nrcy5sZW5ndGg7XG4gICAgbGV0IG4gPSBsaXN0Lmxlbmd0aDtcbiAgICBsZXQgaSA9IG87XG4gICAgY29uc3Qgb2xkX2luZGV4ZXMgPSB7fTtcbiAgICB3aGlsZSAoaS0tKVxuICAgICAgICBvbGRfaW5kZXhlc1tvbGRfYmxvY2tzW2ldLmtleV0gPSBpO1xuICAgIGNvbnN0IG5ld19ibG9ja3MgPSBbXTtcbiAgICBjb25zdCBuZXdfbG9va3VwID0gbmV3IE1hcCgpO1xuICAgIGNvbnN0IGRlbHRhcyA9IG5ldyBNYXAoKTtcbiAgICBpID0gbjtcbiAgICB3aGlsZSAoaS0tKSB7XG4gICAgICAgIGNvbnN0IGNoaWxkX2N0eCA9IGdldF9jb250ZXh0KGN0eCwgbGlzdCwgaSk7XG4gICAgICAgIGNvbnN0IGtleSA9IGdldF9rZXkoY2hpbGRfY3R4KTtcbiAgICAgICAgbGV0IGJsb2NrID0gbG9va3VwLmdldChrZXkpO1xuICAgICAgICBpZiAoIWJsb2NrKSB7XG4gICAgICAgICAgICBibG9jayA9IGNyZWF0ZV9lYWNoX2Jsb2NrKGtleSwgY2hpbGRfY3R4KTtcbiAgICAgICAgICAgIGJsb2NrLmMoKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIGlmIChkeW5hbWljKSB7XG4gICAgICAgICAgICBibG9jay5wKGNoaWxkX2N0eCwgZGlydHkpO1xuICAgICAgICB9XG4gICAgICAgIG5ld19sb29rdXAuc2V0KGtleSwgbmV3X2Jsb2Nrc1tpXSA9IGJsb2NrKTtcbiAgICAgICAgaWYgKGtleSBpbiBvbGRfaW5kZXhlcylcbiAgICAgICAgICAgIGRlbHRhcy5zZXQoa2V5LCBNYXRoLmFicyhpIC0gb2xkX2luZGV4ZXNba2V5XSkpO1xuICAgIH1cbiAgICBjb25zdCB3aWxsX21vdmUgPSBuZXcgU2V0KCk7XG4gICAgY29uc3QgZGlkX21vdmUgPSBuZXcgU2V0KCk7XG4gICAgZnVuY3Rpb24gaW5zZXJ0KGJsb2NrKSB7XG4gICAgICAgIHRyYW5zaXRpb25faW4oYmxvY2ssIDEpO1xuICAgICAgICBibG9jay5tKG5vZGUsIG5leHQpO1xuICAgICAgICBsb29rdXAuc2V0KGJsb2NrLmtleSwgYmxvY2spO1xuICAgICAgICBuZXh0ID0gYmxvY2suZmlyc3Q7XG4gICAgICAgIG4tLTtcbiAgICB9XG4gICAgd2hpbGUgKG8gJiYgbikge1xuICAgICAgICBjb25zdCBuZXdfYmxvY2sgPSBuZXdfYmxvY2tzW24gLSAxXTtcbiAgICAgICAgY29uc3Qgb2xkX2Jsb2NrID0gb2xkX2Jsb2Nrc1tvIC0gMV07XG4gICAgICAgIGNvbnN0IG5ld19rZXkgPSBuZXdfYmxvY2sua2V5O1xuICAgICAgICBjb25zdCBvbGRfa2V5ID0gb2xkX2Jsb2NrLmtleTtcbiAgICAgICAgaWYgKG5ld19ibG9jayA9PT0gb2xkX2Jsb2NrKSB7XG4gICAgICAgICAgICAvLyBkbyBub3RoaW5nXG4gICAgICAgICAgICBuZXh0ID0gbmV3X2Jsb2NrLmZpcnN0O1xuICAgICAgICAgICAgby0tO1xuICAgICAgICAgICAgbi0tO1xuICAgICAgICB9XG4gICAgICAgIGVsc2UgaWYgKCFuZXdfbG9va3VwLmhhcyhvbGRfa2V5KSkge1xuICAgICAgICAgICAgLy8gcmVtb3ZlIG9sZCBibG9ja1xuICAgICAgICAgICAgZGVzdHJveShvbGRfYmxvY2ssIGxvb2t1cCk7XG4gICAgICAgICAgICBvLS07XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSBpZiAoIWxvb2t1cC5oYXMobmV3X2tleSkgfHwgd2lsbF9tb3ZlLmhhcyhuZXdfa2V5KSkge1xuICAgICAgICAgICAgaW5zZXJ0KG5ld19ibG9jayk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSBpZiAoZGlkX21vdmUuaGFzKG9sZF9rZXkpKSB7XG4gICAgICAgICAgICBvLS07XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSBpZiAoZGVsdGFzLmdldChuZXdfa2V5KSA+IGRlbHRhcy5nZXQob2xkX2tleSkpIHtcbiAgICAgICAgICAgIGRpZF9tb3ZlLmFkZChuZXdfa2V5KTtcbiAgICAgICAgICAgIGluc2VydChuZXdfYmxvY2spO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgd2lsbF9tb3ZlLmFkZChvbGRfa2V5KTtcbiAgICAgICAgICAgIG8tLTtcbiAgICAgICAgfVxuICAgIH1cbiAgICB3aGlsZSAoby0tKSB7XG4gICAgICAgIGNvbnN0IG9sZF9ibG9jayA9IG9sZF9ibG9ja3Nbb107XG4gICAgICAgIGlmICghbmV3X2xvb2t1cC5oYXMob2xkX2Jsb2NrLmtleSkpXG4gICAgICAgICAgICBkZXN0cm95KG9sZF9ibG9jaywgbG9va3VwKTtcbiAgICB9XG4gICAgd2hpbGUgKG4pXG4gICAgICAgIGluc2VydChuZXdfYmxvY2tzW24gLSAxXSk7XG4gICAgcmV0dXJuIG5ld19ibG9ja3M7XG59XG5mdW5jdGlvbiB2YWxpZGF0ZV9lYWNoX2tleXMoY3R4LCBsaXN0LCBnZXRfY29udGV4dCwgZ2V0X2tleSkge1xuICAgIGNvbnN0IGtleXMgPSBuZXcgU2V0KCk7XG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBsaXN0Lmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIGNvbnN0IGtleSA9IGdldF9rZXkoZ2V0X2NvbnRleHQoY3R4LCBsaXN0LCBpKSk7XG4gICAgICAgIGlmIChrZXlzLmhhcyhrZXkpKSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYENhbm5vdCBoYXZlIGR1cGxpY2F0ZSBrZXlzIGluIGEga2V5ZWQgZWFjaGApO1xuICAgICAgICB9XG4gICAgICAgIGtleXMuYWRkKGtleSk7XG4gICAgfVxufVxuXG5mdW5jdGlvbiBnZXRfc3ByZWFkX3VwZGF0ZShsZXZlbHMsIHVwZGF0ZXMpIHtcbiAgICBjb25zdCB1cGRhdGUgPSB7fTtcbiAgICBjb25zdCB0b19udWxsX291dCA9IHt9O1xuICAgIGNvbnN0IGFjY291bnRlZF9mb3IgPSB7ICQkc2NvcGU6IDEgfTtcbiAgICBsZXQgaSA9IGxldmVscy5sZW5ndGg7XG4gICAgd2hpbGUgKGktLSkge1xuICAgICAgICBjb25zdCBvID0gbGV2ZWxzW2ldO1xuICAgICAgICBjb25zdCBuID0gdXBkYXRlc1tpXTtcbiAgICAgICAgaWYgKG4pIHtcbiAgICAgICAgICAgIGZvciAoY29uc3Qga2V5IGluIG8pIHtcbiAgICAgICAgICAgICAgICBpZiAoIShrZXkgaW4gbikpXG4gICAgICAgICAgICAgICAgICAgIHRvX251bGxfb3V0W2tleV0gPSAxO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZm9yIChjb25zdCBrZXkgaW4gbikge1xuICAgICAgICAgICAgICAgIGlmICghYWNjb3VudGVkX2ZvcltrZXldKSB7XG4gICAgICAgICAgICAgICAgICAgIHVwZGF0ZVtrZXldID0gbltrZXldO1xuICAgICAgICAgICAgICAgICAgICBhY2NvdW50ZWRfZm9yW2tleV0gPSAxO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGxldmVsc1tpXSA9IG47XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICBmb3IgKGNvbnN0IGtleSBpbiBvKSB7XG4gICAgICAgICAgICAgICAgYWNjb3VudGVkX2ZvcltrZXldID0gMTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cbiAgICBmb3IgKGNvbnN0IGtleSBpbiB0b19udWxsX291dCkge1xuICAgICAgICBpZiAoIShrZXkgaW4gdXBkYXRlKSlcbiAgICAgICAgICAgIHVwZGF0ZVtrZXldID0gdW5kZWZpbmVkO1xuICAgIH1cbiAgICByZXR1cm4gdXBkYXRlO1xufVxuZnVuY3Rpb24gZ2V0X3NwcmVhZF9vYmplY3Qoc3ByZWFkX3Byb3BzKSB7XG4gICAgcmV0dXJuIHR5cGVvZiBzcHJlYWRfcHJvcHMgPT09ICdvYmplY3QnICYmIHNwcmVhZF9wcm9wcyAhPT0gbnVsbCA/IHNwcmVhZF9wcm9wcyA6IHt9O1xufVxuXG4vLyBzb3VyY2U6IGh0dHBzOi8vaHRtbC5zcGVjLndoYXR3Zy5vcmcvbXVsdGlwYWdlL2luZGljZXMuaHRtbFxuY29uc3QgYm9vbGVhbl9hdHRyaWJ1dGVzID0gbmV3IFNldChbXG4gICAgJ2FsbG93ZnVsbHNjcmVlbicsXG4gICAgJ2FsbG93cGF5bWVudHJlcXVlc3QnLFxuICAgICdhc3luYycsXG4gICAgJ2F1dG9mb2N1cycsXG4gICAgJ2F1dG9wbGF5JyxcbiAgICAnY2hlY2tlZCcsXG4gICAgJ2NvbnRyb2xzJyxcbiAgICAnZGVmYXVsdCcsXG4gICAgJ2RlZmVyJyxcbiAgICAnZGlzYWJsZWQnLFxuICAgICdmb3Jtbm92YWxpZGF0ZScsXG4gICAgJ2hpZGRlbicsXG4gICAgJ2lzbWFwJyxcbiAgICAnbG9vcCcsXG4gICAgJ211bHRpcGxlJyxcbiAgICAnbXV0ZWQnLFxuICAgICdub21vZHVsZScsXG4gICAgJ25vdmFsaWRhdGUnLFxuICAgICdvcGVuJyxcbiAgICAncGxheXNpbmxpbmUnLFxuICAgICdyZWFkb25seScsXG4gICAgJ3JlcXVpcmVkJyxcbiAgICAncmV2ZXJzZWQnLFxuICAgICdzZWxlY3RlZCdcbl0pO1xuXG5jb25zdCBpbnZhbGlkX2F0dHJpYnV0ZV9uYW1lX2NoYXJhY3RlciA9IC9bXFxzJ1wiPi89XFx1e0ZERDB9LVxcdXtGREVGfVxcdXtGRkZFfVxcdXtGRkZGfVxcdXsxRkZGRX1cXHV7MUZGRkZ9XFx1ezJGRkZFfVxcdXsyRkZGRn1cXHV7M0ZGRkV9XFx1ezNGRkZGfVxcdXs0RkZGRX1cXHV7NEZGRkZ9XFx1ezVGRkZFfVxcdXs1RkZGRn1cXHV7NkZGRkV9XFx1ezZGRkZGfVxcdXs3RkZGRX1cXHV7N0ZGRkZ9XFx1ezhGRkZFfVxcdXs4RkZGRn1cXHV7OUZGRkV9XFx1ezlGRkZGfVxcdXtBRkZGRX1cXHV7QUZGRkZ9XFx1e0JGRkZFfVxcdXtCRkZGRn1cXHV7Q0ZGRkV9XFx1e0NGRkZGfVxcdXtERkZGRX1cXHV7REZGRkZ9XFx1e0VGRkZFfVxcdXtFRkZGRn1cXHV7RkZGRkV9XFx1e0ZGRkZGfVxcdXsxMEZGRkV9XFx1ezEwRkZGRn1dL3U7XG4vLyBodHRwczovL2h0bWwuc3BlYy53aGF0d2cub3JnL211bHRpcGFnZS9zeW50YXguaHRtbCNhdHRyaWJ1dGVzLTJcbi8vIGh0dHBzOi8vaW5mcmEuc3BlYy53aGF0d2cub3JnLyNub25jaGFyYWN0ZXJcbmZ1bmN0aW9uIHNwcmVhZChhcmdzLCBjbGFzc2VzX3RvX2FkZCkge1xuICAgIGNvbnN0IGF0dHJpYnV0ZXMgPSBPYmplY3QuYXNzaWduKHt9LCAuLi5hcmdzKTtcbiAgICBpZiAoY2xhc3Nlc190b19hZGQpIHtcbiAgICAgICAgaWYgKGF0dHJpYnV0ZXMuY2xhc3MgPT0gbnVsbCkge1xuICAgICAgICAgICAgYXR0cmlidXRlcy5jbGFzcyA9IGNsYXNzZXNfdG9fYWRkO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgYXR0cmlidXRlcy5jbGFzcyArPSAnICcgKyBjbGFzc2VzX3RvX2FkZDtcbiAgICAgICAgfVxuICAgIH1cbiAgICBsZXQgc3RyID0gJyc7XG4gICAgT2JqZWN0LmtleXMoYXR0cmlidXRlcykuZm9yRWFjaChuYW1lID0+IHtcbiAgICAgICAgaWYgKGludmFsaWRfYXR0cmlidXRlX25hbWVfY2hhcmFjdGVyLnRlc3QobmFtZSkpXG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIGNvbnN0IHZhbHVlID0gYXR0cmlidXRlc1tuYW1lXTtcbiAgICAgICAgaWYgKHZhbHVlID09PSB0cnVlKVxuICAgICAgICAgICAgc3RyICs9IFwiIFwiICsgbmFtZTtcbiAgICAgICAgZWxzZSBpZiAoYm9vbGVhbl9hdHRyaWJ1dGVzLmhhcyhuYW1lLnRvTG93ZXJDYXNlKCkpKSB7XG4gICAgICAgICAgICBpZiAodmFsdWUpXG4gICAgICAgICAgICAgICAgc3RyICs9IFwiIFwiICsgbmFtZTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIGlmICh2YWx1ZSAhPSBudWxsKSB7XG4gICAgICAgICAgICBzdHIgKz0gYCAke25hbWV9PVwiJHtTdHJpbmcodmFsdWUpLnJlcGxhY2UoL1wiL2csICcmIzM0OycpLnJlcGxhY2UoLycvZywgJyYjMzk7Jyl9XCJgO1xuICAgICAgICB9XG4gICAgfSk7XG4gICAgcmV0dXJuIHN0cjtcbn1cbmNvbnN0IGVzY2FwZWQgPSB7XG4gICAgJ1wiJzogJyZxdW90OycsXG4gICAgXCInXCI6ICcmIzM5OycsXG4gICAgJyYnOiAnJmFtcDsnLFxuICAgICc8JzogJyZsdDsnLFxuICAgICc+JzogJyZndDsnXG59O1xuZnVuY3Rpb24gZXNjYXBlKGh0bWwpIHtcbiAgICByZXR1cm4gU3RyaW5nKGh0bWwpLnJlcGxhY2UoL1tcIicmPD5dL2csIG1hdGNoID0+IGVzY2FwZWRbbWF0Y2hdKTtcbn1cbmZ1bmN0aW9uIGVhY2goaXRlbXMsIGZuKSB7XG4gICAgbGV0IHN0ciA9ICcnO1xuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgaXRlbXMubGVuZ3RoOyBpICs9IDEpIHtcbiAgICAgICAgc3RyICs9IGZuKGl0ZW1zW2ldLCBpKTtcbiAgICB9XG4gICAgcmV0dXJuIHN0cjtcbn1cbmNvbnN0IG1pc3NpbmdfY29tcG9uZW50ID0ge1xuICAgICQkcmVuZGVyOiAoKSA9PiAnJ1xufTtcbmZ1bmN0aW9uIHZhbGlkYXRlX2NvbXBvbmVudChjb21wb25lbnQsIG5hbWUpIHtcbiAgICBpZiAoIWNvbXBvbmVudCB8fCAhY29tcG9uZW50LiQkcmVuZGVyKSB7XG4gICAgICAgIGlmIChuYW1lID09PSAnc3ZlbHRlOmNvbXBvbmVudCcpXG4gICAgICAgICAgICBuYW1lICs9ICcgdGhpcz17Li4ufSc7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihgPCR7bmFtZX0+IGlzIG5vdCBhIHZhbGlkIFNTUiBjb21wb25lbnQuIFlvdSBtYXkgbmVlZCB0byByZXZpZXcgeW91ciBidWlsZCBjb25maWcgdG8gZW5zdXJlIHRoYXQgZGVwZW5kZW5jaWVzIGFyZSBjb21waWxlZCwgcmF0aGVyIHRoYW4gaW1wb3J0ZWQgYXMgcHJlLWNvbXBpbGVkIG1vZHVsZXNgKTtcbiAgICB9XG4gICAgcmV0dXJuIGNvbXBvbmVudDtcbn1cbmZ1bmN0aW9uIGRlYnVnKGZpbGUsIGxpbmUsIGNvbHVtbiwgdmFsdWVzKSB7XG4gICAgY29uc29sZS5sb2coYHtAZGVidWd9ICR7ZmlsZSA/IGZpbGUgKyAnICcgOiAnJ30oJHtsaW5lfToke2NvbHVtbn0pYCk7IC8vIGVzbGludC1kaXNhYmxlLWxpbmUgbm8tY29uc29sZVxuICAgIGNvbnNvbGUubG9nKHZhbHVlcyk7IC8vIGVzbGludC1kaXNhYmxlLWxpbmUgbm8tY29uc29sZVxuICAgIHJldHVybiAnJztcbn1cbmxldCBvbl9kZXN0cm95O1xuZnVuY3Rpb24gY3JlYXRlX3Nzcl9jb21wb25lbnQoZm4pIHtcbiAgICBmdW5jdGlvbiAkJHJlbmRlcihyZXN1bHQsIHByb3BzLCBiaW5kaW5ncywgc2xvdHMpIHtcbiAgICAgICAgY29uc3QgcGFyZW50X2NvbXBvbmVudCA9IGN1cnJlbnRfY29tcG9uZW50O1xuICAgICAgICBjb25zdCAkJCA9IHtcbiAgICAgICAgICAgIG9uX2Rlc3Ryb3ksXG4gICAgICAgICAgICBjb250ZXh0OiBuZXcgTWFwKHBhcmVudF9jb21wb25lbnQgPyBwYXJlbnRfY29tcG9uZW50LiQkLmNvbnRleHQgOiBbXSksXG4gICAgICAgICAgICAvLyB0aGVzZSB3aWxsIGJlIGltbWVkaWF0ZWx5IGRpc2NhcmRlZFxuICAgICAgICAgICAgb25fbW91bnQ6IFtdLFxuICAgICAgICAgICAgYmVmb3JlX3VwZGF0ZTogW10sXG4gICAgICAgICAgICBhZnRlcl91cGRhdGU6IFtdLFxuICAgICAgICAgICAgY2FsbGJhY2tzOiBibGFua19vYmplY3QoKVxuICAgICAgICB9O1xuICAgICAgICBzZXRfY3VycmVudF9jb21wb25lbnQoeyAkJCB9KTtcbiAgICAgICAgY29uc3QgaHRtbCA9IGZuKHJlc3VsdCwgcHJvcHMsIGJpbmRpbmdzLCBzbG90cyk7XG4gICAgICAgIHNldF9jdXJyZW50X2NvbXBvbmVudChwYXJlbnRfY29tcG9uZW50KTtcbiAgICAgICAgcmV0dXJuIGh0bWw7XG4gICAgfVxuICAgIHJldHVybiB7XG4gICAgICAgIHJlbmRlcjogKHByb3BzID0ge30sIG9wdGlvbnMgPSB7fSkgPT4ge1xuICAgICAgICAgICAgb25fZGVzdHJveSA9IFtdO1xuICAgICAgICAgICAgY29uc3QgcmVzdWx0ID0geyB0aXRsZTogJycsIGhlYWQ6ICcnLCBjc3M6IG5ldyBTZXQoKSB9O1xuICAgICAgICAgICAgY29uc3QgaHRtbCA9ICQkcmVuZGVyKHJlc3VsdCwgcHJvcHMsIHt9LCBvcHRpb25zKTtcbiAgICAgICAgICAgIHJ1bl9hbGwob25fZGVzdHJveSk7XG4gICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgIGh0bWwsXG4gICAgICAgICAgICAgICAgY3NzOiB7XG4gICAgICAgICAgICAgICAgICAgIGNvZGU6IEFycmF5LmZyb20ocmVzdWx0LmNzcykubWFwKGNzcyA9PiBjc3MuY29kZSkuam9pbignXFxuJyksXG4gICAgICAgICAgICAgICAgICAgIG1hcDogbnVsbCAvLyBUT0RPXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBoZWFkOiByZXN1bHQudGl0bGUgKyByZXN1bHQuaGVhZFxuICAgICAgICAgICAgfTtcbiAgICAgICAgfSxcbiAgICAgICAgJCRyZW5kZXJcbiAgICB9O1xufVxuZnVuY3Rpb24gYWRkX2F0dHJpYnV0ZShuYW1lLCB2YWx1ZSwgYm9vbGVhbikge1xuICAgIGlmICh2YWx1ZSA9PSBudWxsIHx8IChib29sZWFuICYmICF2YWx1ZSkpXG4gICAgICAgIHJldHVybiAnJztcbiAgICByZXR1cm4gYCAke25hbWV9JHt2YWx1ZSA9PT0gdHJ1ZSA/ICcnIDogYD0ke3R5cGVvZiB2YWx1ZSA9PT0gJ3N0cmluZycgPyBKU09OLnN0cmluZ2lmeShlc2NhcGUodmFsdWUpKSA6IGBcIiR7dmFsdWV9XCJgfWB9YDtcbn1cbmZ1bmN0aW9uIGFkZF9jbGFzc2VzKGNsYXNzZXMpIHtcbiAgICByZXR1cm4gY2xhc3NlcyA/IGAgY2xhc3M9XCIke2NsYXNzZXN9XCJgIDogYGA7XG59XG5cbmZ1bmN0aW9uIGJpbmQoY29tcG9uZW50LCBuYW1lLCBjYWxsYmFjaykge1xuICAgIGNvbnN0IGluZGV4ID0gY29tcG9uZW50LiQkLnByb3BzW25hbWVdO1xuICAgIGlmIChpbmRleCAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIGNvbXBvbmVudC4kJC5ib3VuZFtpbmRleF0gPSBjYWxsYmFjaztcbiAgICAgICAgY2FsbGJhY2soY29tcG9uZW50LiQkLmN0eFtpbmRleF0pO1xuICAgIH1cbn1cbmZ1bmN0aW9uIGNyZWF0ZV9jb21wb25lbnQoYmxvY2spIHtcbiAgICBibG9jayAmJiBibG9jay5jKCk7XG59XG5mdW5jdGlvbiBjbGFpbV9jb21wb25lbnQoYmxvY2ssIHBhcmVudF9ub2Rlcykge1xuICAgIGJsb2NrICYmIGJsb2NrLmwocGFyZW50X25vZGVzKTtcbn1cbmZ1bmN0aW9uIG1vdW50X2NvbXBvbmVudChjb21wb25lbnQsIHRhcmdldCwgYW5jaG9yKSB7XG4gICAgY29uc3QgeyBmcmFnbWVudCwgb25fbW91bnQsIG9uX2Rlc3Ryb3ksIGFmdGVyX3VwZGF0ZSB9ID0gY29tcG9uZW50LiQkO1xuICAgIGZyYWdtZW50ICYmIGZyYWdtZW50Lm0odGFyZ2V0LCBhbmNob3IpO1xuICAgIC8vIG9uTW91bnQgaGFwcGVucyBiZWZvcmUgdGhlIGluaXRpYWwgYWZ0ZXJVcGRhdGVcbiAgICBhZGRfcmVuZGVyX2NhbGxiYWNrKCgpID0+IHtcbiAgICAgICAgY29uc3QgbmV3X29uX2Rlc3Ryb3kgPSBvbl9tb3VudC5tYXAocnVuKS5maWx0ZXIoaXNfZnVuY3Rpb24pO1xuICAgICAgICBpZiAob25fZGVzdHJveSkge1xuICAgICAgICAgICAgb25fZGVzdHJveS5wdXNoKC4uLm5ld19vbl9kZXN0cm95KTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIC8vIEVkZ2UgY2FzZSAtIGNvbXBvbmVudCB3YXMgZGVzdHJveWVkIGltbWVkaWF0ZWx5LFxuICAgICAgICAgICAgLy8gbW9zdCBsaWtlbHkgYXMgYSByZXN1bHQgb2YgYSBiaW5kaW5nIGluaXRpYWxpc2luZ1xuICAgICAgICAgICAgcnVuX2FsbChuZXdfb25fZGVzdHJveSk7XG4gICAgICAgIH1cbiAgICAgICAgY29tcG9uZW50LiQkLm9uX21vdW50ID0gW107XG4gICAgfSk7XG4gICAgYWZ0ZXJfdXBkYXRlLmZvckVhY2goYWRkX3JlbmRlcl9jYWxsYmFjayk7XG59XG5mdW5jdGlvbiBkZXN0cm95X2NvbXBvbmVudChjb21wb25lbnQsIGRldGFjaGluZykge1xuICAgIGNvbnN0ICQkID0gY29tcG9uZW50LiQkO1xuICAgIGlmICgkJC5mcmFnbWVudCAhPT0gbnVsbCkge1xuICAgICAgICBydW5fYWxsKCQkLm9uX2Rlc3Ryb3kpO1xuICAgICAgICAkJC5mcmFnbWVudCAmJiAkJC5mcmFnbWVudC5kKGRldGFjaGluZyk7XG4gICAgICAgIC8vIFRPRE8gbnVsbCBvdXQgb3RoZXIgcmVmcywgaW5jbHVkaW5nIGNvbXBvbmVudC4kJCAoYnV0IG5lZWQgdG9cbiAgICAgICAgLy8gcHJlc2VydmUgZmluYWwgc3RhdGU/KVxuICAgICAgICAkJC5vbl9kZXN0cm95ID0gJCQuZnJhZ21lbnQgPSBudWxsO1xuICAgICAgICAkJC5jdHggPSBbXTtcbiAgICB9XG59XG5mdW5jdGlvbiBtYWtlX2RpcnR5KGNvbXBvbmVudCwgaSkge1xuICAgIGlmIChjb21wb25lbnQuJCQuZGlydHlbMF0gPT09IC0xKSB7XG4gICAgICAgIGRpcnR5X2NvbXBvbmVudHMucHVzaChjb21wb25lbnQpO1xuICAgICAgICBzY2hlZHVsZV91cGRhdGUoKTtcbiAgICAgICAgY29tcG9uZW50LiQkLmRpcnR5LmZpbGwoMCk7XG4gICAgfVxuICAgIGNvbXBvbmVudC4kJC5kaXJ0eVsoaSAvIDMxKSB8IDBdIHw9ICgxIDw8IChpICUgMzEpKTtcbn1cbmZ1bmN0aW9uIGluaXQoY29tcG9uZW50LCBvcHRpb25zLCBpbnN0YW5jZSwgY3JlYXRlX2ZyYWdtZW50LCBub3RfZXF1YWwsIHByb3BzLCBkaXJ0eSA9IFstMV0pIHtcbiAgICBjb25zdCBwYXJlbnRfY29tcG9uZW50ID0gY3VycmVudF9jb21wb25lbnQ7XG4gICAgc2V0X2N1cnJlbnRfY29tcG9uZW50KGNvbXBvbmVudCk7XG4gICAgY29uc3QgcHJvcF92YWx1ZXMgPSBvcHRpb25zLnByb3BzIHx8IHt9O1xuICAgIGNvbnN0ICQkID0gY29tcG9uZW50LiQkID0ge1xuICAgICAgICBmcmFnbWVudDogbnVsbCxcbiAgICAgICAgY3R4OiBudWxsLFxuICAgICAgICAvLyBzdGF0ZVxuICAgICAgICBwcm9wcyxcbiAgICAgICAgdXBkYXRlOiBub29wLFxuICAgICAgICBub3RfZXF1YWwsXG4gICAgICAgIGJvdW5kOiBibGFua19vYmplY3QoKSxcbiAgICAgICAgLy8gbGlmZWN5Y2xlXG4gICAgICAgIG9uX21vdW50OiBbXSxcbiAgICAgICAgb25fZGVzdHJveTogW10sXG4gICAgICAgIGJlZm9yZV91cGRhdGU6IFtdLFxuICAgICAgICBhZnRlcl91cGRhdGU6IFtdLFxuICAgICAgICBjb250ZXh0OiBuZXcgTWFwKHBhcmVudF9jb21wb25lbnQgPyBwYXJlbnRfY29tcG9uZW50LiQkLmNvbnRleHQgOiBbXSksXG4gICAgICAgIC8vIGV2ZXJ5dGhpbmcgZWxzZVxuICAgICAgICBjYWxsYmFja3M6IGJsYW5rX29iamVjdCgpLFxuICAgICAgICBkaXJ0eVxuICAgIH07XG4gICAgbGV0IHJlYWR5ID0gZmFsc2U7XG4gICAgJCQuY3R4ID0gaW5zdGFuY2VcbiAgICAgICAgPyBpbnN0YW5jZShjb21wb25lbnQsIHByb3BfdmFsdWVzLCAoaSwgcmV0LCAuLi5yZXN0KSA9PiB7XG4gICAgICAgICAgICBjb25zdCB2YWx1ZSA9IHJlc3QubGVuZ3RoID8gcmVzdFswXSA6IHJldDtcbiAgICAgICAgICAgIGlmICgkJC5jdHggJiYgbm90X2VxdWFsKCQkLmN0eFtpXSwgJCQuY3R4W2ldID0gdmFsdWUpKSB7XG4gICAgICAgICAgICAgICAgaWYgKCQkLmJvdW5kW2ldKVxuICAgICAgICAgICAgICAgICAgICAkJC5ib3VuZFtpXSh2YWx1ZSk7XG4gICAgICAgICAgICAgICAgaWYgKHJlYWR5KVxuICAgICAgICAgICAgICAgICAgICBtYWtlX2RpcnR5KGNvbXBvbmVudCwgaSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gcmV0O1xuICAgICAgICB9KVxuICAgICAgICA6IFtdO1xuICAgICQkLnVwZGF0ZSgpO1xuICAgIHJlYWR5ID0gdHJ1ZTtcbiAgICBydW5fYWxsKCQkLmJlZm9yZV91cGRhdGUpO1xuICAgIC8vIGBmYWxzZWAgYXMgYSBzcGVjaWFsIGNhc2Ugb2Ygbm8gRE9NIGNvbXBvbmVudFxuICAgICQkLmZyYWdtZW50ID0gY3JlYXRlX2ZyYWdtZW50ID8gY3JlYXRlX2ZyYWdtZW50KCQkLmN0eCkgOiBmYWxzZTtcbiAgICBpZiAob3B0aW9ucy50YXJnZXQpIHtcbiAgICAgICAgaWYgKG9wdGlvbnMuaHlkcmF0ZSkge1xuICAgICAgICAgICAgY29uc3Qgbm9kZXMgPSBjaGlsZHJlbihvcHRpb25zLnRhcmdldCk7XG4gICAgICAgICAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L25vLW5vbi1udWxsLWFzc2VydGlvblxuICAgICAgICAgICAgJCQuZnJhZ21lbnQgJiYgJCQuZnJhZ21lbnQubChub2Rlcyk7XG4gICAgICAgICAgICBub2Rlcy5mb3JFYWNoKGRldGFjaCk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L25vLW5vbi1udWxsLWFzc2VydGlvblxuICAgICAgICAgICAgJCQuZnJhZ21lbnQgJiYgJCQuZnJhZ21lbnQuYygpO1xuICAgICAgICB9XG4gICAgICAgIGlmIChvcHRpb25zLmludHJvKVxuICAgICAgICAgICAgdHJhbnNpdGlvbl9pbihjb21wb25lbnQuJCQuZnJhZ21lbnQpO1xuICAgICAgICBtb3VudF9jb21wb25lbnQoY29tcG9uZW50LCBvcHRpb25zLnRhcmdldCwgb3B0aW9ucy5hbmNob3IpO1xuICAgICAgICBmbHVzaCgpO1xuICAgIH1cbiAgICBzZXRfY3VycmVudF9jb21wb25lbnQocGFyZW50X2NvbXBvbmVudCk7XG59XG5sZXQgU3ZlbHRlRWxlbWVudDtcbmlmICh0eXBlb2YgSFRNTEVsZW1lbnQgPT09ICdmdW5jdGlvbicpIHtcbiAgICBTdmVsdGVFbGVtZW50ID0gY2xhc3MgZXh0ZW5kcyBIVE1MRWxlbWVudCB7XG4gICAgICAgIGNvbnN0cnVjdG9yKCkge1xuICAgICAgICAgICAgc3VwZXIoKTtcbiAgICAgICAgICAgIHRoaXMuYXR0YWNoU2hhZG93KHsgbW9kZTogJ29wZW4nIH0pO1xuICAgICAgICB9XG4gICAgICAgIGNvbm5lY3RlZENhbGxiYWNrKCkge1xuICAgICAgICAgICAgLy8gQHRzLWlnbm9yZSB0b2RvOiBpbXByb3ZlIHR5cGluZ3NcbiAgICAgICAgICAgIGZvciAoY29uc3Qga2V5IGluIHRoaXMuJCQuc2xvdHRlZCkge1xuICAgICAgICAgICAgICAgIC8vIEB0cy1pZ25vcmUgdG9kbzogaW1wcm92ZSB0eXBpbmdzXG4gICAgICAgICAgICAgICAgdGhpcy5hcHBlbmRDaGlsZCh0aGlzLiQkLnNsb3R0ZWRba2V5XSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgYXR0cmlidXRlQ2hhbmdlZENhbGxiYWNrKGF0dHIsIF9vbGRWYWx1ZSwgbmV3VmFsdWUpIHtcbiAgICAgICAgICAgIHRoaXNbYXR0cl0gPSBuZXdWYWx1ZTtcbiAgICAgICAgfVxuICAgICAgICAkZGVzdHJveSgpIHtcbiAgICAgICAgICAgIGRlc3Ryb3lfY29tcG9uZW50KHRoaXMsIDEpO1xuICAgICAgICAgICAgdGhpcy4kZGVzdHJveSA9IG5vb3A7XG4gICAgICAgIH1cbiAgICAgICAgJG9uKHR5cGUsIGNhbGxiYWNrKSB7XG4gICAgICAgICAgICAvLyBUT0RPIHNob3VsZCB0aGlzIGRlbGVnYXRlIHRvIGFkZEV2ZW50TGlzdGVuZXI/XG4gICAgICAgICAgICBjb25zdCBjYWxsYmFja3MgPSAodGhpcy4kJC5jYWxsYmFja3NbdHlwZV0gfHwgKHRoaXMuJCQuY2FsbGJhY2tzW3R5cGVdID0gW10pKTtcbiAgICAgICAgICAgIGNhbGxiYWNrcy5wdXNoKGNhbGxiYWNrKTtcbiAgICAgICAgICAgIHJldHVybiAoKSA9PiB7XG4gICAgICAgICAgICAgICAgY29uc3QgaW5kZXggPSBjYWxsYmFja3MuaW5kZXhPZihjYWxsYmFjayk7XG4gICAgICAgICAgICAgICAgaWYgKGluZGV4ICE9PSAtMSlcbiAgICAgICAgICAgICAgICAgICAgY2FsbGJhY2tzLnNwbGljZShpbmRleCwgMSk7XG4gICAgICAgICAgICB9O1xuICAgICAgICB9XG4gICAgICAgICRzZXQoKSB7XG4gICAgICAgICAgICAvLyBvdmVycmlkZGVuIGJ5IGluc3RhbmNlLCBpZiBpdCBoYXMgcHJvcHNcbiAgICAgICAgfVxuICAgIH07XG59XG5jbGFzcyBTdmVsdGVDb21wb25lbnQge1xuICAgICRkZXN0cm95KCkge1xuICAgICAgICBkZXN0cm95X2NvbXBvbmVudCh0aGlzLCAxKTtcbiAgICAgICAgdGhpcy4kZGVzdHJveSA9IG5vb3A7XG4gICAgfVxuICAgICRvbih0eXBlLCBjYWxsYmFjaykge1xuICAgICAgICBjb25zdCBjYWxsYmFja3MgPSAodGhpcy4kJC5jYWxsYmFja3NbdHlwZV0gfHwgKHRoaXMuJCQuY2FsbGJhY2tzW3R5cGVdID0gW10pKTtcbiAgICAgICAgY2FsbGJhY2tzLnB1c2goY2FsbGJhY2spO1xuICAgICAgICByZXR1cm4gKCkgPT4ge1xuICAgICAgICAgICAgY29uc3QgaW5kZXggPSBjYWxsYmFja3MuaW5kZXhPZihjYWxsYmFjayk7XG4gICAgICAgICAgICBpZiAoaW5kZXggIT09IC0xKVxuICAgICAgICAgICAgICAgIGNhbGxiYWNrcy5zcGxpY2UoaW5kZXgsIDEpO1xuICAgICAgICB9O1xuICAgIH1cbiAgICAkc2V0KCkge1xuICAgICAgICAvLyBvdmVycmlkZGVuIGJ5IGluc3RhbmNlLCBpZiBpdCBoYXMgcHJvcHNcbiAgICB9XG59XG5cbmZ1bmN0aW9uIGRpc3BhdGNoX2Rldih0eXBlLCBkZXRhaWwpIHtcbiAgICBkb2N1bWVudC5kaXNwYXRjaEV2ZW50KGN1c3RvbV9ldmVudCh0eXBlLCBPYmplY3QuYXNzaWduKHsgdmVyc2lvbjogJzMuMjQuMCcgfSwgZGV0YWlsKSkpO1xufVxuZnVuY3Rpb24gYXBwZW5kX2Rldih0YXJnZXQsIG5vZGUpIHtcbiAgICBkaXNwYXRjaF9kZXYoXCJTdmVsdGVET01JbnNlcnRcIiwgeyB0YXJnZXQsIG5vZGUgfSk7XG4gICAgYXBwZW5kKHRhcmdldCwgbm9kZSk7XG59XG5mdW5jdGlvbiBpbnNlcnRfZGV2KHRhcmdldCwgbm9kZSwgYW5jaG9yKSB7XG4gICAgZGlzcGF0Y2hfZGV2KFwiU3ZlbHRlRE9NSW5zZXJ0XCIsIHsgdGFyZ2V0LCBub2RlLCBhbmNob3IgfSk7XG4gICAgaW5zZXJ0KHRhcmdldCwgbm9kZSwgYW5jaG9yKTtcbn1cbmZ1bmN0aW9uIGRldGFjaF9kZXYobm9kZSkge1xuICAgIGRpc3BhdGNoX2RldihcIlN2ZWx0ZURPTVJlbW92ZVwiLCB7IG5vZGUgfSk7XG4gICAgZGV0YWNoKG5vZGUpO1xufVxuZnVuY3Rpb24gZGV0YWNoX2JldHdlZW5fZGV2KGJlZm9yZSwgYWZ0ZXIpIHtcbiAgICB3aGlsZSAoYmVmb3JlLm5leHRTaWJsaW5nICYmIGJlZm9yZS5uZXh0U2libGluZyAhPT0gYWZ0ZXIpIHtcbiAgICAgICAgZGV0YWNoX2RldihiZWZvcmUubmV4dFNpYmxpbmcpO1xuICAgIH1cbn1cbmZ1bmN0aW9uIGRldGFjaF9iZWZvcmVfZGV2KGFmdGVyKSB7XG4gICAgd2hpbGUgKGFmdGVyLnByZXZpb3VzU2libGluZykge1xuICAgICAgICBkZXRhY2hfZGV2KGFmdGVyLnByZXZpb3VzU2libGluZyk7XG4gICAgfVxufVxuZnVuY3Rpb24gZGV0YWNoX2FmdGVyX2RldihiZWZvcmUpIHtcbiAgICB3aGlsZSAoYmVmb3JlLm5leHRTaWJsaW5nKSB7XG4gICAgICAgIGRldGFjaF9kZXYoYmVmb3JlLm5leHRTaWJsaW5nKTtcbiAgICB9XG59XG5mdW5jdGlvbiBsaXN0ZW5fZGV2KG5vZGUsIGV2ZW50LCBoYW5kbGVyLCBvcHRpb25zLCBoYXNfcHJldmVudF9kZWZhdWx0LCBoYXNfc3RvcF9wcm9wYWdhdGlvbikge1xuICAgIGNvbnN0IG1vZGlmaWVycyA9IG9wdGlvbnMgPT09IHRydWUgPyBbXCJjYXB0dXJlXCJdIDogb3B0aW9ucyA/IEFycmF5LmZyb20oT2JqZWN0LmtleXMob3B0aW9ucykpIDogW107XG4gICAgaWYgKGhhc19wcmV2ZW50X2RlZmF1bHQpXG4gICAgICAgIG1vZGlmaWVycy5wdXNoKCdwcmV2ZW50RGVmYXVsdCcpO1xuICAgIGlmIChoYXNfc3RvcF9wcm9wYWdhdGlvbilcbiAgICAgICAgbW9kaWZpZXJzLnB1c2goJ3N0b3BQcm9wYWdhdGlvbicpO1xuICAgIGRpc3BhdGNoX2RldihcIlN2ZWx0ZURPTUFkZEV2ZW50TGlzdGVuZXJcIiwgeyBub2RlLCBldmVudCwgaGFuZGxlciwgbW9kaWZpZXJzIH0pO1xuICAgIGNvbnN0IGRpc3Bvc2UgPSBsaXN0ZW4obm9kZSwgZXZlbnQsIGhhbmRsZXIsIG9wdGlvbnMpO1xuICAgIHJldHVybiAoKSA9PiB7XG4gICAgICAgIGRpc3BhdGNoX2RldihcIlN2ZWx0ZURPTVJlbW92ZUV2ZW50TGlzdGVuZXJcIiwgeyBub2RlLCBldmVudCwgaGFuZGxlciwgbW9kaWZpZXJzIH0pO1xuICAgICAgICBkaXNwb3NlKCk7XG4gICAgfTtcbn1cbmZ1bmN0aW9uIGF0dHJfZGV2KG5vZGUsIGF0dHJpYnV0ZSwgdmFsdWUpIHtcbiAgICBhdHRyKG5vZGUsIGF0dHJpYnV0ZSwgdmFsdWUpO1xuICAgIGlmICh2YWx1ZSA9PSBudWxsKVxuICAgICAgICBkaXNwYXRjaF9kZXYoXCJTdmVsdGVET01SZW1vdmVBdHRyaWJ1dGVcIiwgeyBub2RlLCBhdHRyaWJ1dGUgfSk7XG4gICAgZWxzZVxuICAgICAgICBkaXNwYXRjaF9kZXYoXCJTdmVsdGVET01TZXRBdHRyaWJ1dGVcIiwgeyBub2RlLCBhdHRyaWJ1dGUsIHZhbHVlIH0pO1xufVxuZnVuY3Rpb24gcHJvcF9kZXYobm9kZSwgcHJvcGVydHksIHZhbHVlKSB7XG4gICAgbm9kZVtwcm9wZXJ0eV0gPSB2YWx1ZTtcbiAgICBkaXNwYXRjaF9kZXYoXCJTdmVsdGVET01TZXRQcm9wZXJ0eVwiLCB7IG5vZGUsIHByb3BlcnR5LCB2YWx1ZSB9KTtcbn1cbmZ1bmN0aW9uIGRhdGFzZXRfZGV2KG5vZGUsIHByb3BlcnR5LCB2YWx1ZSkge1xuICAgIG5vZGUuZGF0YXNldFtwcm9wZXJ0eV0gPSB2YWx1ZTtcbiAgICBkaXNwYXRjaF9kZXYoXCJTdmVsdGVET01TZXREYXRhc2V0XCIsIHsgbm9kZSwgcHJvcGVydHksIHZhbHVlIH0pO1xufVxuZnVuY3Rpb24gc2V0X2RhdGFfZGV2KHRleHQsIGRhdGEpIHtcbiAgICBkYXRhID0gJycgKyBkYXRhO1xuICAgIGlmICh0ZXh0Lndob2xlVGV4dCA9PT0gZGF0YSlcbiAgICAgICAgcmV0dXJuO1xuICAgIGRpc3BhdGNoX2RldihcIlN2ZWx0ZURPTVNldERhdGFcIiwgeyBub2RlOiB0ZXh0LCBkYXRhIH0pO1xuICAgIHRleHQuZGF0YSA9IGRhdGE7XG59XG5mdW5jdGlvbiB2YWxpZGF0ZV9lYWNoX2FyZ3VtZW50KGFyZykge1xuICAgIGlmICh0eXBlb2YgYXJnICE9PSAnc3RyaW5nJyAmJiAhKGFyZyAmJiB0eXBlb2YgYXJnID09PSAnb2JqZWN0JyAmJiAnbGVuZ3RoJyBpbiBhcmcpKSB7XG4gICAgICAgIGxldCBtc2cgPSAneyNlYWNofSBvbmx5IGl0ZXJhdGVzIG92ZXIgYXJyYXktbGlrZSBvYmplY3RzLic7XG4gICAgICAgIGlmICh0eXBlb2YgU3ltYm9sID09PSAnZnVuY3Rpb24nICYmIGFyZyAmJiBTeW1ib2wuaXRlcmF0b3IgaW4gYXJnKSB7XG4gICAgICAgICAgICBtc2cgKz0gJyBZb3UgY2FuIHVzZSBhIHNwcmVhZCB0byBjb252ZXJ0IHRoaXMgaXRlcmFibGUgaW50byBhbiBhcnJheS4nO1xuICAgICAgICB9XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihtc2cpO1xuICAgIH1cbn1cbmZ1bmN0aW9uIHZhbGlkYXRlX3Nsb3RzKG5hbWUsIHNsb3QsIGtleXMpIHtcbiAgICBmb3IgKGNvbnN0IHNsb3Rfa2V5IG9mIE9iamVjdC5rZXlzKHNsb3QpKSB7XG4gICAgICAgIGlmICghfmtleXMuaW5kZXhPZihzbG90X2tleSkpIHtcbiAgICAgICAgICAgIGNvbnNvbGUud2FybihgPCR7bmFtZX0+IHJlY2VpdmVkIGFuIHVuZXhwZWN0ZWQgc2xvdCBcIiR7c2xvdF9rZXl9XCIuYCk7XG4gICAgICAgIH1cbiAgICB9XG59XG5jbGFzcyBTdmVsdGVDb21wb25lbnREZXYgZXh0ZW5kcyBTdmVsdGVDb21wb25lbnQge1xuICAgIGNvbnN0cnVjdG9yKG9wdGlvbnMpIHtcbiAgICAgICAgaWYgKCFvcHRpb25zIHx8ICghb3B0aW9ucy50YXJnZXQgJiYgIW9wdGlvbnMuJCRpbmxpbmUpKSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYCd0YXJnZXQnIGlzIGEgcmVxdWlyZWQgb3B0aW9uYCk7XG4gICAgICAgIH1cbiAgICAgICAgc3VwZXIoKTtcbiAgICB9XG4gICAgJGRlc3Ryb3koKSB7XG4gICAgICAgIHN1cGVyLiRkZXN0cm95KCk7XG4gICAgICAgIHRoaXMuJGRlc3Ryb3kgPSAoKSA9PiB7XG4gICAgICAgICAgICBjb25zb2xlLndhcm4oYENvbXBvbmVudCB3YXMgYWxyZWFkeSBkZXN0cm95ZWRgKTsgLy8gZXNsaW50LWRpc2FibGUtbGluZSBuby1jb25zb2xlXG4gICAgICAgIH07XG4gICAgfVxuICAgICRjYXB0dXJlX3N0YXRlKCkgeyB9XG4gICAgJGluamVjdF9zdGF0ZSgpIHsgfVxufVxuZnVuY3Rpb24gbG9vcF9ndWFyZCh0aW1lb3V0KSB7XG4gICAgY29uc3Qgc3RhcnQgPSBEYXRlLm5vdygpO1xuICAgIHJldHVybiAoKSA9PiB7XG4gICAgICAgIGlmIChEYXRlLm5vdygpIC0gc3RhcnQgPiB0aW1lb3V0KSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYEluZmluaXRlIGxvb3AgZGV0ZWN0ZWRgKTtcbiAgICAgICAgfVxuICAgIH07XG59XG5cbmV4cG9ydCB7IEh0bWxUYWcsIFN2ZWx0ZUNvbXBvbmVudCwgU3ZlbHRlQ29tcG9uZW50RGV2LCBTdmVsdGVFbGVtZW50LCBhY3Rpb25fZGVzdHJveWVyLCBhZGRfYXR0cmlidXRlLCBhZGRfY2xhc3NlcywgYWRkX2ZsdXNoX2NhbGxiYWNrLCBhZGRfbG9jYXRpb24sIGFkZF9yZW5kZXJfY2FsbGJhY2ssIGFkZF9yZXNpemVfbGlzdGVuZXIsIGFkZF90cmFuc2Zvcm0sIGFmdGVyVXBkYXRlLCBhcHBlbmQsIGFwcGVuZF9kZXYsIGFzc2lnbiwgYXR0ciwgYXR0cl9kZXYsIGJlZm9yZVVwZGF0ZSwgYmluZCwgYmluZGluZ19jYWxsYmFja3MsIGJsYW5rX29iamVjdCwgYnViYmxlLCBjaGVja19vdXRyb3MsIGNoaWxkcmVuLCBjbGFpbV9jb21wb25lbnQsIGNsYWltX2VsZW1lbnQsIGNsYWltX3NwYWNlLCBjbGFpbV90ZXh0LCBjbGVhcl9sb29wcywgY29tcG9uZW50X3N1YnNjcmliZSwgY29tcHV0ZV9yZXN0X3Byb3BzLCBjcmVhdGVFdmVudERpc3BhdGNoZXIsIGNyZWF0ZV9hbmltYXRpb24sIGNyZWF0ZV9iaWRpcmVjdGlvbmFsX3RyYW5zaXRpb24sIGNyZWF0ZV9jb21wb25lbnQsIGNyZWF0ZV9pbl90cmFuc2l0aW9uLCBjcmVhdGVfb3V0X3RyYW5zaXRpb24sIGNyZWF0ZV9zbG90LCBjcmVhdGVfc3NyX2NvbXBvbmVudCwgY3VycmVudF9jb21wb25lbnQsIGN1c3RvbV9ldmVudCwgZGF0YXNldF9kZXYsIGRlYnVnLCBkZXN0cm95X2Jsb2NrLCBkZXN0cm95X2NvbXBvbmVudCwgZGVzdHJveV9lYWNoLCBkZXRhY2gsIGRldGFjaF9hZnRlcl9kZXYsIGRldGFjaF9iZWZvcmVfZGV2LCBkZXRhY2hfYmV0d2Vlbl9kZXYsIGRldGFjaF9kZXYsIGRpcnR5X2NvbXBvbmVudHMsIGRpc3BhdGNoX2RldiwgZWFjaCwgZWxlbWVudCwgZWxlbWVudF9pcywgZW1wdHksIGVzY2FwZSwgZXNjYXBlZCwgZXhjbHVkZV9pbnRlcm5hbF9wcm9wcywgZml4X2FuZF9kZXN0cm95X2Jsb2NrLCBmaXhfYW5kX291dHJvX2FuZF9kZXN0cm95X2Jsb2NrLCBmaXhfcG9zaXRpb24sIGZsdXNoLCBnZXRDb250ZXh0LCBnZXRfYmluZGluZ19ncm91cF92YWx1ZSwgZ2V0X2N1cnJlbnRfY29tcG9uZW50LCBnZXRfc2xvdF9jaGFuZ2VzLCBnZXRfc2xvdF9jb250ZXh0LCBnZXRfc3ByZWFkX29iamVjdCwgZ2V0X3NwcmVhZF91cGRhdGUsIGdldF9zdG9yZV92YWx1ZSwgZ2xvYmFscywgZ3JvdXBfb3V0cm9zLCBoYW5kbGVfcHJvbWlzZSwgaGFzX3Byb3AsIGlkZW50aXR5LCBpbml0LCBpbnNlcnQsIGluc2VydF9kZXYsIGludHJvcywgaW52YWxpZF9hdHRyaWJ1dGVfbmFtZV9jaGFyYWN0ZXIsIGlzX2NsaWVudCwgaXNfY3Jvc3NvcmlnaW4sIGlzX2Z1bmN0aW9uLCBpc19wcm9taXNlLCBsaXN0ZW4sIGxpc3Rlbl9kZXYsIGxvb3AsIGxvb3BfZ3VhcmQsIG1pc3NpbmdfY29tcG9uZW50LCBtb3VudF9jb21wb25lbnQsIG5vb3AsIG5vdF9lcXVhbCwgbm93LCBudWxsX3RvX2VtcHR5LCBvYmplY3Rfd2l0aG91dF9wcm9wZXJ0aWVzLCBvbkRlc3Ryb3ksIG9uTW91bnQsIG9uY2UsIG91dHJvX2FuZF9kZXN0cm95X2Jsb2NrLCBwcmV2ZW50X2RlZmF1bHQsIHByb3BfZGV2LCBxdWVyeV9zZWxlY3Rvcl9hbGwsIHJhZiwgcnVuLCBydW5fYWxsLCBzYWZlX25vdF9lcXVhbCwgc2NoZWR1bGVfdXBkYXRlLCBzZWxlY3RfbXVsdGlwbGVfdmFsdWUsIHNlbGVjdF9vcHRpb24sIHNlbGVjdF9vcHRpb25zLCBzZWxlY3RfdmFsdWUsIHNlbGYsIHNldENvbnRleHQsIHNldF9hdHRyaWJ1dGVzLCBzZXRfY3VycmVudF9jb21wb25lbnQsIHNldF9jdXN0b21fZWxlbWVudF9kYXRhLCBzZXRfZGF0YSwgc2V0X2RhdGFfZGV2LCBzZXRfaW5wdXRfdHlwZSwgc2V0X2lucHV0X3ZhbHVlLCBzZXRfbm93LCBzZXRfcmFmLCBzZXRfc3RvcmVfdmFsdWUsIHNldF9zdHlsZSwgc2V0X3N2Z19hdHRyaWJ1dGVzLCBzcGFjZSwgc3ByZWFkLCBzdG9wX3Byb3BhZ2F0aW9uLCBzdWJzY3JpYmUsIHN2Z19lbGVtZW50LCB0ZXh0LCB0aWNrLCB0aW1lX3Jhbmdlc190b19hcnJheSwgdG9fbnVtYmVyLCB0b2dnbGVfY2xhc3MsIHRyYW5zaXRpb25faW4sIHRyYW5zaXRpb25fb3V0LCB1cGRhdGVfa2V5ZWRfZWFjaCwgdXBkYXRlX3Nsb3QsIHZhbGlkYXRlX2NvbXBvbmVudCwgdmFsaWRhdGVfZWFjaF9hcmd1bWVudCwgdmFsaWRhdGVfZWFjaF9rZXlzLCB2YWxpZGF0ZV9zbG90cywgdmFsaWRhdGVfc3RvcmUsIHhsaW5rX2F0dHIgfTtcbiIsImltcG9ydCB7IG5vb3AsIHNhZmVfbm90X2VxdWFsLCBzdWJzY3JpYmUsIHJ1bl9hbGwsIGlzX2Z1bmN0aW9uIH0gZnJvbSAnLi4vaW50ZXJuYWwnO1xuZXhwb3J0IHsgZ2V0X3N0b3JlX3ZhbHVlIGFzIGdldCB9IGZyb20gJy4uL2ludGVybmFsJztcblxuY29uc3Qgc3Vic2NyaWJlcl9xdWV1ZSA9IFtdO1xuLyoqXG4gKiBDcmVhdGVzIGEgYFJlYWRhYmxlYCBzdG9yZSB0aGF0IGFsbG93cyByZWFkaW5nIGJ5IHN1YnNjcmlwdGlvbi5cbiAqIEBwYXJhbSB2YWx1ZSBpbml0aWFsIHZhbHVlXG4gKiBAcGFyYW0ge1N0YXJ0U3RvcE5vdGlmaWVyfXN0YXJ0IHN0YXJ0IGFuZCBzdG9wIG5vdGlmaWNhdGlvbnMgZm9yIHN1YnNjcmlwdGlvbnNcbiAqL1xuZnVuY3Rpb24gcmVhZGFibGUodmFsdWUsIHN0YXJ0KSB7XG4gICAgcmV0dXJuIHtcbiAgICAgICAgc3Vic2NyaWJlOiB3cml0YWJsZSh2YWx1ZSwgc3RhcnQpLnN1YnNjcmliZSxcbiAgICB9O1xufVxuLyoqXG4gKiBDcmVhdGUgYSBgV3JpdGFibGVgIHN0b3JlIHRoYXQgYWxsb3dzIGJvdGggdXBkYXRpbmcgYW5kIHJlYWRpbmcgYnkgc3Vic2NyaXB0aW9uLlxuICogQHBhcmFtIHsqPX12YWx1ZSBpbml0aWFsIHZhbHVlXG4gKiBAcGFyYW0ge1N0YXJ0U3RvcE5vdGlmaWVyPX1zdGFydCBzdGFydCBhbmQgc3RvcCBub3RpZmljYXRpb25zIGZvciBzdWJzY3JpcHRpb25zXG4gKi9cbmZ1bmN0aW9uIHdyaXRhYmxlKHZhbHVlLCBzdGFydCA9IG5vb3ApIHtcbiAgICBsZXQgc3RvcDtcbiAgICBjb25zdCBzdWJzY3JpYmVycyA9IFtdO1xuICAgIGZ1bmN0aW9uIHNldChuZXdfdmFsdWUpIHtcbiAgICAgICAgaWYgKHNhZmVfbm90X2VxdWFsKHZhbHVlLCBuZXdfdmFsdWUpKSB7XG4gICAgICAgICAgICB2YWx1ZSA9IG5ld192YWx1ZTtcbiAgICAgICAgICAgIGlmIChzdG9wKSB7IC8vIHN0b3JlIGlzIHJlYWR5XG4gICAgICAgICAgICAgICAgY29uc3QgcnVuX3F1ZXVlID0gIXN1YnNjcmliZXJfcXVldWUubGVuZ3RoO1xuICAgICAgICAgICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgc3Vic2NyaWJlcnMubGVuZ3RoOyBpICs9IDEpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgcyA9IHN1YnNjcmliZXJzW2ldO1xuICAgICAgICAgICAgICAgICAgICBzWzFdKCk7XG4gICAgICAgICAgICAgICAgICAgIHN1YnNjcmliZXJfcXVldWUucHVzaChzLCB2YWx1ZSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlmIChydW5fcXVldWUpIHtcbiAgICAgICAgICAgICAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBzdWJzY3JpYmVyX3F1ZXVlLmxlbmd0aDsgaSArPSAyKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBzdWJzY3JpYmVyX3F1ZXVlW2ldWzBdKHN1YnNjcmliZXJfcXVldWVbaSArIDFdKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBzdWJzY3JpYmVyX3F1ZXVlLmxlbmd0aCA9IDA7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuICAgIGZ1bmN0aW9uIHVwZGF0ZShmbikge1xuICAgICAgICBzZXQoZm4odmFsdWUpKTtcbiAgICB9XG4gICAgZnVuY3Rpb24gc3Vic2NyaWJlKHJ1biwgaW52YWxpZGF0ZSA9IG5vb3ApIHtcbiAgICAgICAgY29uc3Qgc3Vic2NyaWJlciA9IFtydW4sIGludmFsaWRhdGVdO1xuICAgICAgICBzdWJzY3JpYmVycy5wdXNoKHN1YnNjcmliZXIpO1xuICAgICAgICBpZiAoc3Vic2NyaWJlcnMubGVuZ3RoID09PSAxKSB7XG4gICAgICAgICAgICBzdG9wID0gc3RhcnQoc2V0KSB8fCBub29wO1xuICAgICAgICB9XG4gICAgICAgIHJ1bih2YWx1ZSk7XG4gICAgICAgIHJldHVybiAoKSA9PiB7XG4gICAgICAgICAgICBjb25zdCBpbmRleCA9IHN1YnNjcmliZXJzLmluZGV4T2Yoc3Vic2NyaWJlcik7XG4gICAgICAgICAgICBpZiAoaW5kZXggIT09IC0xKSB7XG4gICAgICAgICAgICAgICAgc3Vic2NyaWJlcnMuc3BsaWNlKGluZGV4LCAxKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChzdWJzY3JpYmVycy5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgICAgICBzdG9wKCk7XG4gICAgICAgICAgICAgICAgc3RvcCA9IG51bGw7XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG4gICAgfVxuICAgIHJldHVybiB7IHNldCwgdXBkYXRlLCBzdWJzY3JpYmUgfTtcbn1cbmZ1bmN0aW9uIGRlcml2ZWQoc3RvcmVzLCBmbiwgaW5pdGlhbF92YWx1ZSkge1xuICAgIGNvbnN0IHNpbmdsZSA9ICFBcnJheS5pc0FycmF5KHN0b3Jlcyk7XG4gICAgY29uc3Qgc3RvcmVzX2FycmF5ID0gc2luZ2xlXG4gICAgICAgID8gW3N0b3Jlc11cbiAgICAgICAgOiBzdG9yZXM7XG4gICAgY29uc3QgYXV0byA9IGZuLmxlbmd0aCA8IDI7XG4gICAgcmV0dXJuIHJlYWRhYmxlKGluaXRpYWxfdmFsdWUsIChzZXQpID0+IHtcbiAgICAgICAgbGV0IGluaXRlZCA9IGZhbHNlO1xuICAgICAgICBjb25zdCB2YWx1ZXMgPSBbXTtcbiAgICAgICAgbGV0IHBlbmRpbmcgPSAwO1xuICAgICAgICBsZXQgY2xlYW51cCA9IG5vb3A7XG4gICAgICAgIGNvbnN0IHN5bmMgPSAoKSA9PiB7XG4gICAgICAgICAgICBpZiAocGVuZGluZykge1xuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNsZWFudXAoKTtcbiAgICAgICAgICAgIGNvbnN0IHJlc3VsdCA9IGZuKHNpbmdsZSA/IHZhbHVlc1swXSA6IHZhbHVlcywgc2V0KTtcbiAgICAgICAgICAgIGlmIChhdXRvKSB7XG4gICAgICAgICAgICAgICAgc2V0KHJlc3VsdCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICBjbGVhbnVwID0gaXNfZnVuY3Rpb24ocmVzdWx0KSA/IHJlc3VsdCA6IG5vb3A7XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG4gICAgICAgIGNvbnN0IHVuc3Vic2NyaWJlcnMgPSBzdG9yZXNfYXJyYXkubWFwKChzdG9yZSwgaSkgPT4gc3Vic2NyaWJlKHN0b3JlLCAodmFsdWUpID0+IHtcbiAgICAgICAgICAgIHZhbHVlc1tpXSA9IHZhbHVlO1xuICAgICAgICAgICAgcGVuZGluZyAmPSB+KDEgPDwgaSk7XG4gICAgICAgICAgICBpZiAoaW5pdGVkKSB7XG4gICAgICAgICAgICAgICAgc3luYygpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9LCAoKSA9PiB7XG4gICAgICAgICAgICBwZW5kaW5nIHw9ICgxIDw8IGkpO1xuICAgICAgICB9KSk7XG4gICAgICAgIGluaXRlZCA9IHRydWU7XG4gICAgICAgIHN5bmMoKTtcbiAgICAgICAgcmV0dXJuIGZ1bmN0aW9uIHN0b3AoKSB7XG4gICAgICAgICAgICBydW5fYWxsKHVuc3Vic2NyaWJlcnMpO1xuICAgICAgICAgICAgY2xlYW51cCgpO1xuICAgICAgICB9O1xuICAgIH0pO1xufVxuXG5leHBvcnQgeyBkZXJpdmVkLCByZWFkYWJsZSwgd3JpdGFibGUgfTtcbiIsImltcG9ydCB7IHdyaXRhYmxlIH0gZnJvbSAnc3ZlbHRlL3N0b3JlJztcblxuZXhwb3J0IGNvbnN0IENPTlRFWFRfS0VZID0ge307XG5cbmV4cG9ydCBjb25zdCBwcmVsb2FkID0gKCkgPT4gKHt9KTsiLCI8c2NyaXB0PlxuXHRpbXBvcnQgTmF2IGZyb20gJy4uL2NvbXBvbmVudHMvTmF2LnN2ZWx0ZSc7XG5cblx0ZXhwb3J0IGxldCBzZWdtZW50O1xuPC9zY3JpcHQ+XG5cbjxzdHlsZT5cblx0bWFpbiB7XG5cdFx0cG9zaXRpb246IHJlbGF0aXZlO1xuXHRcdG1heC13aWR0aDogNTZlbTtcblx0XHRiYWNrZ3JvdW5kLWNvbG9yOiB3aGl0ZTtcblx0XHRwYWRkaW5nOiAyZW07XG5cdFx0bWFyZ2luOiAwIGF1dG87XG5cdFx0Ym94LXNpemluZzogYm9yZGVyLWJveDtcblx0fVxuPC9zdHlsZT5cblxuPE5hdiB7c2VnbWVudH0vPlxuXG48bWFpbj5cblx0PHNsb3Q+PC9zbG90PlxuPC9tYWluPiIsIjxzY3JpcHQ+XG5cdGV4cG9ydCBsZXQgc3RhdHVzO1xuXHRleHBvcnQgbGV0IGVycm9yO1xuXG5cdGNvbnN0IGRldiA9IHByb2Nlc3MuZW52Lk5PREVfRU5WID09PSAnZGV2ZWxvcG1lbnQnO1xuPC9zY3JpcHQ+XG5cbjxzdHlsZT5cblx0aDEsIHAge1xuXHRcdG1hcmdpbjogMCBhdXRvO1xuXHR9XG5cblx0aDEge1xuXHRcdGZvbnQtc2l6ZTogMi44ZW07XG5cdFx0Zm9udC13ZWlnaHQ6IDcwMDtcblx0XHRtYXJnaW46IDAgMCAwLjVlbSAwO1xuXHR9XG5cblx0cCB7XG5cdFx0bWFyZ2luOiAxZW0gYXV0bztcblx0fVxuXG5cdEBtZWRpYSAobWluLXdpZHRoOiA0ODBweCkge1xuXHRcdGgxIHtcblx0XHRcdGZvbnQtc2l6ZTogNGVtO1xuXHRcdH1cblx0fVxuPC9zdHlsZT5cblxuPHN2ZWx0ZTpoZWFkPlxuXHQ8dGl0bGU+e3N0YXR1c308L3RpdGxlPlxuPC9zdmVsdGU6aGVhZD5cblxuPGgxPntzdGF0dXN9PC9oMT5cblxuPHA+e2Vycm9yLm1lc3NhZ2V9PC9wPlxuXG57I2lmIGRldiAmJiBlcnJvci5zdGFja31cblx0PHByZT57ZXJyb3Iuc3RhY2t9PC9wcmU+XG57L2lmfVxuIiwiPCEtLSBUaGlzIGZpbGUgaXMgZ2VuZXJhdGVkIGJ5IFNhcHBlciDigJQgZG8gbm90IGVkaXQgaXQhIC0tPlxuPHNjcmlwdD5cblx0aW1wb3J0IHsgc2V0Q29udGV4dCwgYWZ0ZXJVcGRhdGUgfSBmcm9tICdzdmVsdGUnO1xuXHRpbXBvcnQgeyBDT05URVhUX0tFWSB9IGZyb20gJy4vc2hhcmVkJztcblx0aW1wb3J0IExheW91dCBmcm9tICcuLi8uLi8uLi9yb3V0ZXMvX2xheW91dC5zdmVsdGUnO1xuXHRpbXBvcnQgRXJyb3IgZnJvbSAnLi4vLi4vLi4vcm91dGVzL19lcnJvci5zdmVsdGUnO1xuXG5cdGV4cG9ydCBsZXQgc3RvcmVzO1xuXHRleHBvcnQgbGV0IGVycm9yO1xuXHRleHBvcnQgbGV0IHN0YXR1cztcblx0ZXhwb3J0IGxldCBzZWdtZW50cztcblx0ZXhwb3J0IGxldCBsZXZlbDA7XG5cdGV4cG9ydCBsZXQgbGV2ZWwxID0gbnVsbDtcblx0ZXhwb3J0IGxldCBub3RpZnk7XG5cblx0YWZ0ZXJVcGRhdGUobm90aWZ5KTtcblx0c2V0Q29udGV4dChDT05URVhUX0tFWSwgc3RvcmVzKTtcbjwvc2NyaXB0PlxuXG48TGF5b3V0IHNlZ21lbnQ9XCJ7c2VnbWVudHNbMF19XCIgey4uLmxldmVsMC5wcm9wc30+XG5cdHsjaWYgZXJyb3J9XG5cdFx0PEVycm9yIHtlcnJvcn0ge3N0YXR1c30vPlxuXHR7OmVsc2V9XG5cdFx0PHN2ZWx0ZTpjb21wb25lbnQgdGhpcz1cIntsZXZlbDEuY29tcG9uZW50fVwiIHsuLi5sZXZlbDEucHJvcHN9Lz5cblx0ey9pZn1cbjwvTGF5b3V0PiIsIi8vIFRoaXMgZmlsZSBpcyBnZW5lcmF0ZWQgYnkgU2FwcGVyIOKAlCBkbyBub3QgZWRpdCBpdCFcbmV4cG9ydCB7IGRlZmF1bHQgYXMgUm9vdCB9IGZyb20gJy4uLy4uLy4uL3JvdXRlcy9fbGF5b3V0LnN2ZWx0ZSc7XG5leHBvcnQgeyBwcmVsb2FkIGFzIHJvb3RfcHJlbG9hZCB9IGZyb20gJy4vc2hhcmVkJztcbmV4cG9ydCB7IGRlZmF1bHQgYXMgRXJyb3JDb21wb25lbnQgfSBmcm9tICcuLi8uLi8uLi9yb3V0ZXMvX2Vycm9yLnN2ZWx0ZSc7XG5cbmV4cG9ydCBjb25zdCBpZ25vcmUgPSBbL15cXC9pbmRleFxcLz8kL107XG5cbmV4cG9ydCBjb25zdCBjb21wb25lbnRzID0gW1xuXHR7XG5cdFx0anM6ICgpID0+IGltcG9ydChcIi4uLy4uLy4uL3JvdXRlcy9pbmRleC5zdmVsdGVcIiksXG5cdFx0Y3NzOiBcIl9fU0FQUEVSX0NTU19QTEFDRUhPTERFUjppbmRleC5zdmVsdGVfX1wiXG5cdH1cbl07XG5cbmV4cG9ydCBjb25zdCByb3V0ZXMgPSBbXG5cdHtcblx0XHQvLyBpbmRleC5zdmVsdGVcblx0XHRwYXR0ZXJuOiAvXlxcLyQvLFxuXHRcdHBhcnRzOiBbXG5cdFx0XHR7IGk6IDAgfVxuXHRcdF1cblx0fVxuXTtcblxuaWYgKHR5cGVvZiB3aW5kb3cgIT09ICd1bmRlZmluZWQnKSB7XG5cdGltcG9ydChcIi9ob21lL2toamRlMTIwNy9WTS9zcGljZS1zdmVsdGUvbm9kZV9tb2R1bGVzL3NhcHBlci9zYXBwZXItZGV2LWNsaWVudC5qc1wiKS50aGVuKGNsaWVudCA9PiB7XG5cdFx0Y2xpZW50LmNvbm5lY3QoMTAwMDApO1xuXHR9KTtcbn0iLCJpbXBvcnQgeyBnZXRDb250ZXh0IH0gZnJvbSAnc3ZlbHRlJztcbmltcG9ydCB7IENPTlRFWFRfS0VZIH0gZnJvbSAnLi9pbnRlcm5hbC9zaGFyZWQnO1xuaW1wb3J0IHsgd3JpdGFibGUgfSBmcm9tICdzdmVsdGUvc3RvcmUnO1xuaW1wb3J0IEFwcCBmcm9tICcuL2ludGVybmFsL0FwcC5zdmVsdGUnO1xuaW1wb3J0IHsgaWdub3JlLCByb3V0ZXMsIHJvb3RfcHJlbG9hZCwgY29tcG9uZW50cywgRXJyb3JDb21wb25lbnQgfSBmcm9tICcuL2ludGVybmFsL21hbmlmZXN0LWNsaWVudCc7XG5cbmZ1bmN0aW9uIGdvdG8oaHJlZiwgb3B0cyA9IHsgcmVwbGFjZVN0YXRlOiBmYWxzZSB9KSB7XG5cdGNvbnN0IHRhcmdldCA9IHNlbGVjdF90YXJnZXQobmV3IFVSTChocmVmLCBkb2N1bWVudC5iYXNlVVJJKSk7XG5cblx0aWYgKHRhcmdldCkge1xuXHRcdF9oaXN0b3J5W29wdHMucmVwbGFjZVN0YXRlID8gJ3JlcGxhY2VTdGF0ZScgOiAncHVzaFN0YXRlJ10oeyBpZDogY2lkIH0sICcnLCBocmVmKTtcblx0XHRyZXR1cm4gbmF2aWdhdGUodGFyZ2V0LCBudWxsKS50aGVuKCgpID0+IHt9KTtcblx0fVxuXG5cdGxvY2F0aW9uLmhyZWYgPSBocmVmO1xuXHRyZXR1cm4gbmV3IFByb21pc2UoZiA9PiB7fSk7IC8vIG5ldmVyIHJlc29sdmVzXG59XG5cbi8qKiBDYWxsYmFjayB0byBpbmZvcm0gb2YgYSB2YWx1ZSB1cGRhdGVzLiAqL1xuXG5cblxuXG5cblxuXG5cblxuXG5cblxuXG5cblxuXG5cblxuXG5mdW5jdGlvbiBwYWdlX3N0b3JlKHZhbHVlKSB7XG5cdGNvbnN0IHN0b3JlID0gd3JpdGFibGUodmFsdWUpO1xuXHRsZXQgcmVhZHkgPSB0cnVlO1xuXG5cdGZ1bmN0aW9uIG5vdGlmeSgpIHtcblx0XHRyZWFkeSA9IHRydWU7XG5cdFx0c3RvcmUudXBkYXRlKHZhbCA9PiB2YWwpO1xuXHR9XG5cblx0ZnVuY3Rpb24gc2V0KG5ld192YWx1ZSkge1xuXHRcdHJlYWR5ID0gZmFsc2U7XG5cdFx0c3RvcmUuc2V0KG5ld192YWx1ZSk7XG5cdH1cblxuXHRmdW5jdGlvbiBzdWJzY3JpYmUocnVuKSB7XG5cdFx0bGV0IG9sZF92YWx1ZTtcblx0XHRyZXR1cm4gc3RvcmUuc3Vic2NyaWJlKCh2YWx1ZSkgPT4ge1xuXHRcdFx0aWYgKG9sZF92YWx1ZSA9PT0gdW5kZWZpbmVkIHx8IChyZWFkeSAmJiB2YWx1ZSAhPT0gb2xkX3ZhbHVlKSkge1xuXHRcdFx0XHRydW4ob2xkX3ZhbHVlID0gdmFsdWUpO1xuXHRcdFx0fVxuXHRcdH0pO1xuXHR9XG5cblx0cmV0dXJuIHsgbm90aWZ5LCBzZXQsIHN1YnNjcmliZSB9O1xufVxuXG5jb25zdCBpbml0aWFsX2RhdGEgPSB0eXBlb2YgX19TQVBQRVJfXyAhPT0gJ3VuZGVmaW5lZCcgJiYgX19TQVBQRVJfXztcblxubGV0IHJlYWR5ID0gZmFsc2U7XG5sZXQgcm9vdF9jb21wb25lbnQ7XG5sZXQgY3VycmVudF90b2tlbjtcbmxldCByb290X3ByZWxvYWRlZDtcbmxldCBjdXJyZW50X2JyYW5jaCA9IFtdO1xubGV0IGN1cnJlbnRfcXVlcnkgPSAne30nO1xuXG5jb25zdCBzdG9yZXMgPSB7XG5cdHBhZ2U6IHBhZ2Vfc3RvcmUoe30pLFxuXHRwcmVsb2FkaW5nOiB3cml0YWJsZShudWxsKSxcblx0c2Vzc2lvbjogd3JpdGFibGUoaW5pdGlhbF9kYXRhICYmIGluaXRpYWxfZGF0YS5zZXNzaW9uKVxufTtcblxubGV0ICRzZXNzaW9uO1xubGV0IHNlc3Npb25fZGlydHk7XG5cbnN0b3Jlcy5zZXNzaW9uLnN1YnNjcmliZShhc3luYyB2YWx1ZSA9PiB7XG5cdCRzZXNzaW9uID0gdmFsdWU7XG5cblx0aWYgKCFyZWFkeSkgcmV0dXJuO1xuXHRzZXNzaW9uX2RpcnR5ID0gdHJ1ZTtcblxuXHRjb25zdCB0YXJnZXQgPSBzZWxlY3RfdGFyZ2V0KG5ldyBVUkwobG9jYXRpb24uaHJlZikpO1xuXG5cdGNvbnN0IHRva2VuID0gY3VycmVudF90b2tlbiA9IHt9O1xuXHRjb25zdCB7IHJlZGlyZWN0LCBwcm9wcywgYnJhbmNoIH0gPSBhd2FpdCBoeWRyYXRlX3RhcmdldCh0YXJnZXQpO1xuXHRpZiAodG9rZW4gIT09IGN1cnJlbnRfdG9rZW4pIHJldHVybjsgLy8gYSBzZWNvbmRhcnkgbmF2aWdhdGlvbiBoYXBwZW5lZCB3aGlsZSB3ZSB3ZXJlIGxvYWRpbmdcblxuXHRhd2FpdCByZW5kZXIocmVkaXJlY3QsIGJyYW5jaCwgcHJvcHMsIHRhcmdldC5wYWdlKTtcbn0pO1xuXG5sZXQgcHJlZmV0Y2hpbmdcblxuXG4gPSBudWxsO1xuZnVuY3Rpb24gc2V0X3ByZWZldGNoaW5nKGhyZWYsIHByb21pc2UpIHtcblx0cHJlZmV0Y2hpbmcgPSB7IGhyZWYsIHByb21pc2UgfTtcbn1cblxubGV0IHRhcmdldDtcbmZ1bmN0aW9uIHNldF90YXJnZXQoZWxlbWVudCkge1xuXHR0YXJnZXQgPSBlbGVtZW50O1xufVxuXG5sZXQgdWlkID0gMTtcbmZ1bmN0aW9uIHNldF91aWQobikge1xuXHR1aWQgPSBuO1xufVxuXG5sZXQgY2lkO1xuZnVuY3Rpb24gc2V0X2NpZChuKSB7XG5cdGNpZCA9IG47XG59XG5cbmNvbnN0IF9oaXN0b3J5ID0gdHlwZW9mIGhpc3RvcnkgIT09ICd1bmRlZmluZWQnID8gaGlzdG9yeSA6IHtcblx0cHVzaFN0YXRlOiAoc3RhdGUsIHRpdGxlLCBocmVmKSA9PiB7fSxcblx0cmVwbGFjZVN0YXRlOiAoc3RhdGUsIHRpdGxlLCBocmVmKSA9PiB7fSxcblx0c2Nyb2xsUmVzdG9yYXRpb246ICcnXG59O1xuXG5jb25zdCBzY3JvbGxfaGlzdG9yeSA9IHt9O1xuXG5mdW5jdGlvbiBleHRyYWN0X3F1ZXJ5KHNlYXJjaCkge1xuXHRjb25zdCBxdWVyeSA9IE9iamVjdC5jcmVhdGUobnVsbCk7XG5cdGlmIChzZWFyY2gubGVuZ3RoID4gMCkge1xuXHRcdHNlYXJjaC5zbGljZSgxKS5zcGxpdCgnJicpLmZvckVhY2goc2VhcmNoUGFyYW0gPT4ge1xuXHRcdFx0bGV0IFssIGtleSwgdmFsdWUgPSAnJ10gPSAvKFtePV0qKSg/Oj0oLiopKT8vLmV4ZWMoZGVjb2RlVVJJQ29tcG9uZW50KHNlYXJjaFBhcmFtLnJlcGxhY2UoL1xcKy9nLCAnICcpKSk7XG5cdFx0XHRpZiAodHlwZW9mIHF1ZXJ5W2tleV0gPT09ICdzdHJpbmcnKSBxdWVyeVtrZXldID0gW3F1ZXJ5W2tleV1dO1xuXHRcdFx0aWYgKHR5cGVvZiBxdWVyeVtrZXldID09PSAnb2JqZWN0JykgKHF1ZXJ5W2tleV0gKS5wdXNoKHZhbHVlKTtcblx0XHRcdGVsc2UgcXVlcnlba2V5XSA9IHZhbHVlO1xuXHRcdH0pO1xuXHR9XG5cdHJldHVybiBxdWVyeTtcbn1cblxuZnVuY3Rpb24gc2VsZWN0X3RhcmdldCh1cmwpIHtcblx0aWYgKHVybC5vcmlnaW4gIT09IGxvY2F0aW9uLm9yaWdpbikgcmV0dXJuIG51bGw7XG5cdGlmICghdXJsLnBhdGhuYW1lLnN0YXJ0c1dpdGgoaW5pdGlhbF9kYXRhLmJhc2VVcmwpKSByZXR1cm4gbnVsbDtcblxuXHRsZXQgcGF0aCA9IHVybC5wYXRobmFtZS5zbGljZShpbml0aWFsX2RhdGEuYmFzZVVybC5sZW5ndGgpO1xuXG5cdGlmIChwYXRoID09PSAnJykge1xuXHRcdHBhdGggPSAnLyc7XG5cdH1cblxuXHQvLyBhdm9pZCBhY2NpZGVudGFsIGNsYXNoZXMgYmV0d2VlbiBzZXJ2ZXIgcm91dGVzIGFuZCBwYWdlIHJvdXRlc1xuXHRpZiAoaWdub3JlLnNvbWUocGF0dGVybiA9PiBwYXR0ZXJuLnRlc3QocGF0aCkpKSByZXR1cm47XG5cblx0Zm9yIChsZXQgaSA9IDA7IGkgPCByb3V0ZXMubGVuZ3RoOyBpICs9IDEpIHtcblx0XHRjb25zdCByb3V0ZSA9IHJvdXRlc1tpXTtcblxuXHRcdGNvbnN0IG1hdGNoID0gcm91dGUucGF0dGVybi5leGVjKHBhdGgpO1xuXG5cdFx0aWYgKG1hdGNoKSB7XG5cdFx0XHRjb25zdCBxdWVyeSA9IGV4dHJhY3RfcXVlcnkodXJsLnNlYXJjaCk7XG5cdFx0XHRjb25zdCBwYXJ0ID0gcm91dGUucGFydHNbcm91dGUucGFydHMubGVuZ3RoIC0gMV07XG5cdFx0XHRjb25zdCBwYXJhbXMgPSBwYXJ0LnBhcmFtcyA/IHBhcnQucGFyYW1zKG1hdGNoKSA6IHt9O1xuXG5cdFx0XHRjb25zdCBwYWdlID0geyBob3N0OiBsb2NhdGlvbi5ob3N0LCBwYXRoLCBxdWVyeSwgcGFyYW1zIH07XG5cblx0XHRcdHJldHVybiB7IGhyZWY6IHVybC5ocmVmLCByb3V0ZSwgbWF0Y2gsIHBhZ2UgfTtcblx0XHR9XG5cdH1cbn1cblxuZnVuY3Rpb24gaGFuZGxlX2Vycm9yKHVybCkge1xuXHRjb25zdCB7IGhvc3QsIHBhdGhuYW1lLCBzZWFyY2ggfSA9IGxvY2F0aW9uO1xuXHRjb25zdCB7IHNlc3Npb24sIHByZWxvYWRlZCwgc3RhdHVzLCBlcnJvciB9ID0gaW5pdGlhbF9kYXRhO1xuXG5cdGlmICghcm9vdF9wcmVsb2FkZWQpIHtcblx0XHRyb290X3ByZWxvYWRlZCA9IHByZWxvYWRlZCAmJiBwcmVsb2FkZWRbMF07XG5cdH1cblxuXHRjb25zdCBwcm9wcyA9IHtcblx0XHRlcnJvcixcblx0XHRzdGF0dXMsXG5cdFx0c2Vzc2lvbixcblx0XHRsZXZlbDA6IHtcblx0XHRcdHByb3BzOiByb290X3ByZWxvYWRlZFxuXHRcdH0sXG5cdFx0bGV2ZWwxOiB7XG5cdFx0XHRwcm9wczoge1xuXHRcdFx0XHRzdGF0dXMsXG5cdFx0XHRcdGVycm9yXG5cdFx0XHR9LFxuXHRcdFx0Y29tcG9uZW50OiBFcnJvckNvbXBvbmVudFxuXHRcdH0sXG5cdFx0c2VnbWVudHM6IHByZWxvYWRlZFxuXG5cdH07XG5cdGNvbnN0IHF1ZXJ5ID0gZXh0cmFjdF9xdWVyeShzZWFyY2gpO1xuXHRyZW5kZXIobnVsbCwgW10sIHByb3BzLCB7IGhvc3QsIHBhdGg6IHBhdGhuYW1lLCBxdWVyeSwgcGFyYW1zOiB7fSB9KTtcbn1cblxuZnVuY3Rpb24gc2Nyb2xsX3N0YXRlKCkge1xuXHRyZXR1cm4ge1xuXHRcdHg6IHBhZ2VYT2Zmc2V0LFxuXHRcdHk6IHBhZ2VZT2Zmc2V0XG5cdH07XG59XG5cbmFzeW5jIGZ1bmN0aW9uIG5hdmlnYXRlKHRhcmdldCwgaWQsIG5vc2Nyb2xsLCBoYXNoKSB7XG5cdGlmIChpZCkge1xuXHRcdC8vIHBvcHN0YXRlIG9yIGluaXRpYWwgbmF2aWdhdGlvblxuXHRcdGNpZCA9IGlkO1xuXHR9IGVsc2Uge1xuXHRcdGNvbnN0IGN1cnJlbnRfc2Nyb2xsID0gc2Nyb2xsX3N0YXRlKCk7XG5cblx0XHQvLyBjbGlja2VkIG9uIGEgbGluay4gcHJlc2VydmUgc2Nyb2xsIHN0YXRlXG5cdFx0c2Nyb2xsX2hpc3RvcnlbY2lkXSA9IGN1cnJlbnRfc2Nyb2xsO1xuXG5cdFx0aWQgPSBjaWQgPSArK3VpZDtcblx0XHRzY3JvbGxfaGlzdG9yeVtjaWRdID0gbm9zY3JvbGwgPyBjdXJyZW50X3Njcm9sbCA6IHsgeDogMCwgeTogMCB9O1xuXHR9XG5cblx0Y2lkID0gaWQ7XG5cblx0aWYgKHJvb3RfY29tcG9uZW50KSBzdG9yZXMucHJlbG9hZGluZy5zZXQodHJ1ZSk7XG5cblx0Y29uc3QgbG9hZGVkID0gcHJlZmV0Y2hpbmcgJiYgcHJlZmV0Y2hpbmcuaHJlZiA9PT0gdGFyZ2V0LmhyZWYgP1xuXHRcdHByZWZldGNoaW5nLnByb21pc2UgOlxuXHRcdGh5ZHJhdGVfdGFyZ2V0KHRhcmdldCk7XG5cblx0cHJlZmV0Y2hpbmcgPSBudWxsO1xuXG5cdGNvbnN0IHRva2VuID0gY3VycmVudF90b2tlbiA9IHt9O1xuXHRjb25zdCB7IHJlZGlyZWN0LCBwcm9wcywgYnJhbmNoIH0gPSBhd2FpdCBsb2FkZWQ7XG5cdGlmICh0b2tlbiAhPT0gY3VycmVudF90b2tlbikgcmV0dXJuOyAvLyBhIHNlY29uZGFyeSBuYXZpZ2F0aW9uIGhhcHBlbmVkIHdoaWxlIHdlIHdlcmUgbG9hZGluZ1xuXG5cdGF3YWl0IHJlbmRlcihyZWRpcmVjdCwgYnJhbmNoLCBwcm9wcywgdGFyZ2V0LnBhZ2UpO1xuXHRpZiAoZG9jdW1lbnQuYWN0aXZlRWxlbWVudCkgZG9jdW1lbnQuYWN0aXZlRWxlbWVudC5ibHVyKCk7XG5cblx0aWYgKCFub3Njcm9sbCkge1xuXHRcdGxldCBzY3JvbGwgPSBzY3JvbGxfaGlzdG9yeVtpZF07XG5cblx0XHRpZiAoaGFzaCkge1xuXHRcdFx0Ly8gc2Nyb2xsIGlzIGFuIGVsZW1lbnQgaWQgKGZyb20gYSBoYXNoKSwgd2UgbmVlZCB0byBjb21wdXRlIHkuXG5cdFx0XHRjb25zdCBkZWVwX2xpbmtlZCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKGhhc2guc2xpY2UoMSkpO1xuXG5cdFx0XHRpZiAoZGVlcF9saW5rZWQpIHtcblx0XHRcdFx0c2Nyb2xsID0ge1xuXHRcdFx0XHRcdHg6IDAsXG5cdFx0XHRcdFx0eTogZGVlcF9saW5rZWQuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCkudG9wICsgc2Nyb2xsWVxuXHRcdFx0XHR9O1xuXHRcdFx0fVxuXHRcdH1cblxuXHRcdHNjcm9sbF9oaXN0b3J5W2NpZF0gPSBzY3JvbGw7XG5cdFx0aWYgKHNjcm9sbCkgc2Nyb2xsVG8oc2Nyb2xsLngsIHNjcm9sbC55KTtcblx0fVxufVxuXG5hc3luYyBmdW5jdGlvbiByZW5kZXIocmVkaXJlY3QsIGJyYW5jaCwgcHJvcHMsIHBhZ2UpIHtcblx0aWYgKHJlZGlyZWN0KSByZXR1cm4gZ290byhyZWRpcmVjdC5sb2NhdGlvbiwgeyByZXBsYWNlU3RhdGU6IHRydWUgfSk7XG5cblx0c3RvcmVzLnBhZ2Uuc2V0KHBhZ2UpO1xuXHRzdG9yZXMucHJlbG9hZGluZy5zZXQoZmFsc2UpO1xuXG5cdGlmIChyb290X2NvbXBvbmVudCkge1xuXHRcdHJvb3RfY29tcG9uZW50LiRzZXQocHJvcHMpO1xuXHR9IGVsc2Uge1xuXHRcdHByb3BzLnN0b3JlcyA9IHtcblx0XHRcdHBhZ2U6IHsgc3Vic2NyaWJlOiBzdG9yZXMucGFnZS5zdWJzY3JpYmUgfSxcblx0XHRcdHByZWxvYWRpbmc6IHsgc3Vic2NyaWJlOiBzdG9yZXMucHJlbG9hZGluZy5zdWJzY3JpYmUgfSxcblx0XHRcdHNlc3Npb246IHN0b3Jlcy5zZXNzaW9uXG5cdFx0fTtcblx0XHRwcm9wcy5sZXZlbDAgPSB7XG5cdFx0XHRwcm9wczogYXdhaXQgcm9vdF9wcmVsb2FkZWRcblx0XHR9O1xuXHRcdHByb3BzLm5vdGlmeSA9IHN0b3Jlcy5wYWdlLm5vdGlmeTtcblxuXHRcdC8vIGZpcnN0IGxvYWQg4oCUIHJlbW92ZSBTU1InZCA8aGVhZD4gY29udGVudHNcblx0XHRjb25zdCBzdGFydCA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJyNzYXBwZXItaGVhZC1zdGFydCcpO1xuXHRcdGNvbnN0IGVuZCA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJyNzYXBwZXItaGVhZC1lbmQnKTtcblxuXHRcdGlmIChzdGFydCAmJiBlbmQpIHtcblx0XHRcdHdoaWxlIChzdGFydC5uZXh0U2libGluZyAhPT0gZW5kKSBkZXRhY2goc3RhcnQubmV4dFNpYmxpbmcpO1xuXHRcdFx0ZGV0YWNoKHN0YXJ0KTtcblx0XHRcdGRldGFjaChlbmQpO1xuXHRcdH1cblxuXHRcdHJvb3RfY29tcG9uZW50ID0gbmV3IEFwcCh7XG5cdFx0XHR0YXJnZXQsXG5cdFx0XHRwcm9wcyxcblx0XHRcdGh5ZHJhdGU6IHRydWVcblx0XHR9KTtcblx0fVxuXG5cdGN1cnJlbnRfYnJhbmNoID0gYnJhbmNoO1xuXHRjdXJyZW50X3F1ZXJ5ID0gSlNPTi5zdHJpbmdpZnkocGFnZS5xdWVyeSk7XG5cdHJlYWR5ID0gdHJ1ZTtcblx0c2Vzc2lvbl9kaXJ0eSA9IGZhbHNlO1xufVxuXG5mdW5jdGlvbiBwYXJ0X2NoYW5nZWQoaSwgc2VnbWVudCwgbWF0Y2gsIHN0cmluZ2lmaWVkX3F1ZXJ5KSB7XG5cdC8vIFRPRE8gb25seSBjaGVjayBxdWVyeSBzdHJpbmcgY2hhbmdlcyBmb3IgcHJlbG9hZCBmdW5jdGlvbnNcblx0Ly8gdGhhdCBkbyBpbiBmYWN0IGRlcGVuZCBvbiBpdCAodXNpbmcgc3RhdGljIGFuYWx5c2lzIG9yXG5cdC8vIHJ1bnRpbWUgaW5zdHJ1bWVudGF0aW9uKVxuXHRpZiAoc3RyaW5naWZpZWRfcXVlcnkgIT09IGN1cnJlbnRfcXVlcnkpIHJldHVybiB0cnVlO1xuXG5cdGNvbnN0IHByZXZpb3VzID0gY3VycmVudF9icmFuY2hbaV07XG5cblx0aWYgKCFwcmV2aW91cykgcmV0dXJuIGZhbHNlO1xuXHRpZiAoc2VnbWVudCAhPT0gcHJldmlvdXMuc2VnbWVudCkgcmV0dXJuIHRydWU7XG5cdGlmIChwcmV2aW91cy5tYXRjaCkge1xuXHRcdGlmIChKU09OLnN0cmluZ2lmeShwcmV2aW91cy5tYXRjaC5zbGljZSgxLCBpICsgMikpICE9PSBKU09OLnN0cmluZ2lmeShtYXRjaC5zbGljZSgxLCBpICsgMikpKSB7XG5cdFx0XHRyZXR1cm4gdHJ1ZTtcblx0XHR9XG5cdH1cbn1cblxuYXN5bmMgZnVuY3Rpb24gaHlkcmF0ZV90YXJnZXQodGFyZ2V0KVxuXG5cblxuIHtcblx0Y29uc3QgeyByb3V0ZSwgcGFnZSB9ID0gdGFyZ2V0O1xuXHRjb25zdCBzZWdtZW50cyA9IHBhZ2UucGF0aC5zcGxpdCgnLycpLmZpbHRlcihCb29sZWFuKTtcblxuXHRsZXQgcmVkaXJlY3QgPSBudWxsO1xuXG5cdGNvbnN0IHByb3BzID0geyBlcnJvcjogbnVsbCwgc3RhdHVzOiAyMDAsIHNlZ21lbnRzOiBbc2VnbWVudHNbMF1dIH07XG5cblx0Y29uc3QgcHJlbG9hZF9jb250ZXh0ID0ge1xuXHRcdGZldGNoOiAodXJsLCBvcHRzKSA9PiBmZXRjaCh1cmwsIG9wdHMpLFxuXHRcdHJlZGlyZWN0OiAoc3RhdHVzQ29kZSwgbG9jYXRpb24pID0+IHtcblx0XHRcdGlmIChyZWRpcmVjdCAmJiAocmVkaXJlY3Quc3RhdHVzQ29kZSAhPT0gc3RhdHVzQ29kZSB8fCByZWRpcmVjdC5sb2NhdGlvbiAhPT0gbG9jYXRpb24pKSB7XG5cdFx0XHRcdHRocm93IG5ldyBFcnJvcihgQ29uZmxpY3RpbmcgcmVkaXJlY3RzYCk7XG5cdFx0XHR9XG5cdFx0XHRyZWRpcmVjdCA9IHsgc3RhdHVzQ29kZSwgbG9jYXRpb24gfTtcblx0XHR9LFxuXHRcdGVycm9yOiAoc3RhdHVzLCBlcnJvcikgPT4ge1xuXHRcdFx0cHJvcHMuZXJyb3IgPSB0eXBlb2YgZXJyb3IgPT09ICdzdHJpbmcnID8gbmV3IEVycm9yKGVycm9yKSA6IGVycm9yO1xuXHRcdFx0cHJvcHMuc3RhdHVzID0gc3RhdHVzO1xuXHRcdH1cblx0fTtcblxuXHRpZiAoIXJvb3RfcHJlbG9hZGVkKSB7XG5cdFx0cm9vdF9wcmVsb2FkZWQgPSBpbml0aWFsX2RhdGEucHJlbG9hZGVkWzBdIHx8IHJvb3RfcHJlbG9hZC5jYWxsKHByZWxvYWRfY29udGV4dCwge1xuXHRcdFx0aG9zdDogcGFnZS5ob3N0LFxuXHRcdFx0cGF0aDogcGFnZS5wYXRoLFxuXHRcdFx0cXVlcnk6IHBhZ2UucXVlcnksXG5cdFx0XHRwYXJhbXM6IHt9XG5cdFx0fSwgJHNlc3Npb24pO1xuXHR9XG5cblx0bGV0IGJyYW5jaDtcblx0bGV0IGwgPSAxO1xuXG5cdHRyeSB7XG5cdFx0Y29uc3Qgc3RyaW5naWZpZWRfcXVlcnkgPSBKU09OLnN0cmluZ2lmeShwYWdlLnF1ZXJ5KTtcblx0XHRjb25zdCBtYXRjaCA9IHJvdXRlLnBhdHRlcm4uZXhlYyhwYWdlLnBhdGgpO1xuXG5cdFx0bGV0IHNlZ21lbnRfZGlydHkgPSBmYWxzZTtcblxuXHRcdGJyYW5jaCA9IGF3YWl0IFByb21pc2UuYWxsKHJvdXRlLnBhcnRzLm1hcChhc3luYyAocGFydCwgaSkgPT4ge1xuXHRcdFx0Y29uc3Qgc2VnbWVudCA9IHNlZ21lbnRzW2ldO1xuXG5cdFx0XHRpZiAocGFydF9jaGFuZ2VkKGksIHNlZ21lbnQsIG1hdGNoLCBzdHJpbmdpZmllZF9xdWVyeSkpIHNlZ21lbnRfZGlydHkgPSB0cnVlO1xuXG5cdFx0XHRwcm9wcy5zZWdtZW50c1tsXSA9IHNlZ21lbnRzW2kgKyAxXTsgLy8gVE9ETyBtYWtlIHRoaXMgbGVzcyBjb25mdXNpbmdcblx0XHRcdGlmICghcGFydCkgcmV0dXJuIHsgc2VnbWVudCB9O1xuXG5cdFx0XHRjb25zdCBqID0gbCsrO1xuXG5cdFx0XHRpZiAoIXNlc3Npb25fZGlydHkgJiYgIXNlZ21lbnRfZGlydHkgJiYgY3VycmVudF9icmFuY2hbaV0gJiYgY3VycmVudF9icmFuY2hbaV0ucGFydCA9PT0gcGFydC5pKSB7XG5cdFx0XHRcdHJldHVybiBjdXJyZW50X2JyYW5jaFtpXTtcblx0XHRcdH1cblxuXHRcdFx0c2VnbWVudF9kaXJ0eSA9IGZhbHNlO1xuXG5cdFx0XHRjb25zdCB7IGRlZmF1bHQ6IGNvbXBvbmVudCwgcHJlbG9hZCB9ID0gYXdhaXQgbG9hZF9jb21wb25lbnQoY29tcG9uZW50c1twYXJ0LmldKTtcblxuXHRcdFx0bGV0IHByZWxvYWRlZDtcblx0XHRcdGlmIChyZWFkeSB8fCAhaW5pdGlhbF9kYXRhLnByZWxvYWRlZFtpICsgMV0pIHtcblx0XHRcdFx0cHJlbG9hZGVkID0gcHJlbG9hZFxuXHRcdFx0XHRcdD8gYXdhaXQgcHJlbG9hZC5jYWxsKHByZWxvYWRfY29udGV4dCwge1xuXHRcdFx0XHRcdFx0aG9zdDogcGFnZS5ob3N0LFxuXHRcdFx0XHRcdFx0cGF0aDogcGFnZS5wYXRoLFxuXHRcdFx0XHRcdFx0cXVlcnk6IHBhZ2UucXVlcnksXG5cdFx0XHRcdFx0XHRwYXJhbXM6IHBhcnQucGFyYW1zID8gcGFydC5wYXJhbXModGFyZ2V0Lm1hdGNoKSA6IHt9XG5cdFx0XHRcdFx0fSwgJHNlc3Npb24pXG5cdFx0XHRcdFx0OiB7fTtcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdHByZWxvYWRlZCA9IGluaXRpYWxfZGF0YS5wcmVsb2FkZWRbaSArIDFdO1xuXHRcdFx0fVxuXG5cdFx0XHRyZXR1cm4gKHByb3BzW2BsZXZlbCR7an1gXSA9IHsgY29tcG9uZW50LCBwcm9wczogcHJlbG9hZGVkLCBzZWdtZW50LCBtYXRjaCwgcGFydDogcGFydC5pIH0pO1xuXHRcdH0pKTtcblx0fSBjYXRjaCAoZXJyb3IpIHtcblx0XHRwcm9wcy5lcnJvciA9IGVycm9yO1xuXHRcdHByb3BzLnN0YXR1cyA9IDUwMDtcblx0XHRicmFuY2ggPSBbXTtcblx0fVxuXG5cdHJldHVybiB7IHJlZGlyZWN0LCBwcm9wcywgYnJhbmNoIH07XG59XG5cbmZ1bmN0aW9uIGxvYWRfY3NzKGNodW5rKSB7XG5cdGNvbnN0IGhyZWYgPSBgY2xpZW50LyR7Y2h1bmt9YDtcblx0aWYgKGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoYGxpbmtbaHJlZj1cIiR7aHJlZn1cIl1gKSkgcmV0dXJuO1xuXG5cdHJldHVybiBuZXcgUHJvbWlzZSgoZnVsZmlsLCByZWplY3QpID0+IHtcblx0XHRjb25zdCBsaW5rID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnbGluaycpO1xuXHRcdGxpbmsucmVsID0gJ3N0eWxlc2hlZXQnO1xuXHRcdGxpbmsuaHJlZiA9IGhyZWY7XG5cblx0XHRsaW5rLm9ubG9hZCA9ICgpID0+IGZ1bGZpbCgpO1xuXHRcdGxpbmsub25lcnJvciA9IHJlamVjdDtcblxuXHRcdGRvY3VtZW50LmhlYWQuYXBwZW5kQ2hpbGQobGluayk7XG5cdH0pO1xufVxuXG5mdW5jdGlvbiBsb2FkX2NvbXBvbmVudChjb21wb25lbnQpXG5cblxuIHtcblx0Ly8gVE9ETyB0aGlzIGlzIHRlbXBvcmFyeSDigJQgb25jZSBwbGFjZWhvbGRlcnMgYXJlXG5cdC8vIGFsd2F5cyByZXdyaXR0ZW4sIHNjcmF0Y2ggdGhlIHRlcm5hcnlcblx0Y29uc3QgcHJvbWlzZXMgPSAodHlwZW9mIGNvbXBvbmVudC5jc3MgPT09ICdzdHJpbmcnID8gW10gOiBjb21wb25lbnQuY3NzLm1hcChsb2FkX2NzcykpO1xuXHRwcm9taXNlcy51bnNoaWZ0KGNvbXBvbmVudC5qcygpKTtcblx0cmV0dXJuIFByb21pc2UuYWxsKHByb21pc2VzKS50aGVuKHZhbHVlcyA9PiB2YWx1ZXNbMF0pO1xufVxuXG5mdW5jdGlvbiBkZXRhY2gobm9kZSkge1xuXHRub2RlLnBhcmVudE5vZGUucmVtb3ZlQ2hpbGQobm9kZSk7XG59XG5cbmZ1bmN0aW9uIHByZWZldGNoKGhyZWYpIHtcblx0Y29uc3QgdGFyZ2V0ID0gc2VsZWN0X3RhcmdldChuZXcgVVJMKGhyZWYsIGRvY3VtZW50LmJhc2VVUkkpKTtcblxuXHRpZiAodGFyZ2V0KSB7XG5cdFx0aWYgKCFwcmVmZXRjaGluZyB8fCBocmVmICE9PSBwcmVmZXRjaGluZy5ocmVmKSB7XG5cdFx0XHRzZXRfcHJlZmV0Y2hpbmcoaHJlZiwgaHlkcmF0ZV90YXJnZXQodGFyZ2V0KSk7XG5cdFx0fVxuXG5cdFx0cmV0dXJuIHByZWZldGNoaW5nLnByb21pc2U7XG5cdH1cbn1cblxuZnVuY3Rpb24gc3RhcnQob3B0c1xuXG4pIHtcblx0aWYgKCdzY3JvbGxSZXN0b3JhdGlvbicgaW4gX2hpc3RvcnkpIHtcblx0XHRfaGlzdG9yeS5zY3JvbGxSZXN0b3JhdGlvbiA9ICdtYW51YWwnO1xuXHR9XG5cdFxuXHQvLyBBZG9wdGVkIGZyb20gTnV4dC5qc1xuXHQvLyBSZXNldCBzY3JvbGxSZXN0b3JhdGlvbiB0byBhdXRvIHdoZW4gbGVhdmluZyBwYWdlLCBhbGxvd2luZyBwYWdlIHJlbG9hZFxuXHQvLyBhbmQgYmFjay1uYXZpZ2F0aW9uIGZyb20gb3RoZXIgcGFnZXMgdG8gdXNlIHRoZSBicm93c2VyIHRvIHJlc3RvcmUgdGhlXG5cdC8vIHNjcm9sbGluZyBwb3NpdGlvbi5cblx0YWRkRXZlbnRMaXN0ZW5lcignYmVmb3JldW5sb2FkJywgKCkgPT4ge1xuXHRcdF9oaXN0b3J5LnNjcm9sbFJlc3RvcmF0aW9uID0gJ2F1dG8nO1xuXHR9KTtcblxuXHQvLyBTZXR0aW5nIHNjcm9sbFJlc3RvcmF0aW9uIHRvIG1hbnVhbCBhZ2FpbiB3aGVuIHJldHVybmluZyB0byB0aGlzIHBhZ2UuXG5cdGFkZEV2ZW50TGlzdGVuZXIoJ2xvYWQnLCAoKSA9PiB7XG5cdFx0X2hpc3Rvcnkuc2Nyb2xsUmVzdG9yYXRpb24gPSAnbWFudWFsJztcblx0fSk7XG5cblx0c2V0X3RhcmdldChvcHRzLnRhcmdldCk7XG5cblx0YWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCBoYW5kbGVfY2xpY2spO1xuXHRhZGRFdmVudExpc3RlbmVyKCdwb3BzdGF0ZScsIGhhbmRsZV9wb3BzdGF0ZSk7XG5cblx0Ly8gcHJlZmV0Y2hcblx0YWRkRXZlbnRMaXN0ZW5lcigndG91Y2hzdGFydCcsIHRyaWdnZXJfcHJlZmV0Y2gpO1xuXHRhZGRFdmVudExpc3RlbmVyKCdtb3VzZW1vdmUnLCBoYW5kbGVfbW91c2Vtb3ZlKTtcblxuXHRyZXR1cm4gUHJvbWlzZS5yZXNvbHZlKCkudGhlbigoKSA9PiB7XG5cdFx0Y29uc3QgeyBoYXNoLCBocmVmIH0gPSBsb2NhdGlvbjtcblxuXHRcdF9oaXN0b3J5LnJlcGxhY2VTdGF0ZSh7IGlkOiB1aWQgfSwgJycsIGhyZWYpO1xuXG5cdFx0Y29uc3QgdXJsID0gbmV3IFVSTChsb2NhdGlvbi5ocmVmKTtcblxuXHRcdGlmIChpbml0aWFsX2RhdGEuZXJyb3IpIHJldHVybiBoYW5kbGVfZXJyb3IoKTtcblxuXHRcdGNvbnN0IHRhcmdldCA9IHNlbGVjdF90YXJnZXQodXJsKTtcblx0XHRpZiAodGFyZ2V0KSByZXR1cm4gbmF2aWdhdGUodGFyZ2V0LCB1aWQsIHRydWUsIGhhc2gpO1xuXHR9KTtcbn1cblxubGV0IG1vdXNlbW92ZV90aW1lb3V0O1xuXG5mdW5jdGlvbiBoYW5kbGVfbW91c2Vtb3ZlKGV2ZW50KSB7XG5cdGNsZWFyVGltZW91dChtb3VzZW1vdmVfdGltZW91dCk7XG5cdG1vdXNlbW92ZV90aW1lb3V0ID0gc2V0VGltZW91dCgoKSA9PiB7XG5cdFx0dHJpZ2dlcl9wcmVmZXRjaChldmVudCk7XG5cdH0sIDIwKTtcbn1cblxuZnVuY3Rpb24gdHJpZ2dlcl9wcmVmZXRjaChldmVudCkge1xuXHRjb25zdCBhID0gZmluZF9hbmNob3IoZXZlbnQudGFyZ2V0KTtcblx0aWYgKCFhIHx8IGEucmVsICE9PSAncHJlZmV0Y2gnKSByZXR1cm47XG5cblx0cHJlZmV0Y2goYS5ocmVmKTtcbn1cblxuZnVuY3Rpb24gaGFuZGxlX2NsaWNrKGV2ZW50KSB7XG5cdC8vIEFkYXB0ZWQgZnJvbSBodHRwczovL2dpdGh1Yi5jb20vdmlzaW9ubWVkaWEvcGFnZS5qc1xuXHQvLyBNSVQgbGljZW5zZSBodHRwczovL2dpdGh1Yi5jb20vdmlzaW9ubWVkaWEvcGFnZS5qcyNsaWNlbnNlXG5cdGlmICh3aGljaChldmVudCkgIT09IDEpIHJldHVybjtcblx0aWYgKGV2ZW50Lm1ldGFLZXkgfHwgZXZlbnQuY3RybEtleSB8fCBldmVudC5zaGlmdEtleSkgcmV0dXJuO1xuXHRpZiAoZXZlbnQuZGVmYXVsdFByZXZlbnRlZCkgcmV0dXJuO1xuXG5cdGNvbnN0IGEgPSBmaW5kX2FuY2hvcihldmVudC50YXJnZXQpO1xuXHRpZiAoIWEpIHJldHVybjtcblxuXHRpZiAoIWEuaHJlZikgcmV0dXJuO1xuXG5cdC8vIGNoZWNrIGlmIGxpbmsgaXMgaW5zaWRlIGFuIHN2Z1xuXHQvLyBpbiB0aGlzIGNhc2UsIGJvdGggaHJlZiBhbmQgdGFyZ2V0IGFyZSBhbHdheXMgaW5zaWRlIGFuIG9iamVjdFxuXHRjb25zdCBzdmcgPSB0eXBlb2YgYS5ocmVmID09PSAnb2JqZWN0JyAmJiBhLmhyZWYuY29uc3RydWN0b3IubmFtZSA9PT0gJ1NWR0FuaW1hdGVkU3RyaW5nJztcblx0Y29uc3QgaHJlZiA9IFN0cmluZyhzdmcgPyAoYSkuaHJlZi5iYXNlVmFsIDogYS5ocmVmKTtcblxuXHRpZiAoaHJlZiA9PT0gbG9jYXRpb24uaHJlZikge1xuXHRcdGlmICghbG9jYXRpb24uaGFzaCkgZXZlbnQucHJldmVudERlZmF1bHQoKTtcblx0XHRyZXR1cm47XG5cdH1cblxuXHQvLyBJZ25vcmUgaWYgdGFnIGhhc1xuXHQvLyAxLiAnZG93bmxvYWQnIGF0dHJpYnV0ZVxuXHQvLyAyLiByZWw9J2V4dGVybmFsJyBhdHRyaWJ1dGVcblx0aWYgKGEuaGFzQXR0cmlidXRlKCdkb3dubG9hZCcpIHx8IGEuZ2V0QXR0cmlidXRlKCdyZWwnKSA9PT0gJ2V4dGVybmFsJykgcmV0dXJuO1xuXG5cdC8vIElnbm9yZSBpZiA8YT4gaGFzIGEgdGFyZ2V0XG5cdGlmIChzdmcgPyAoYSkudGFyZ2V0LmJhc2VWYWwgOiBhLnRhcmdldCkgcmV0dXJuO1xuXG5cdGNvbnN0IHVybCA9IG5ldyBVUkwoaHJlZik7XG5cblx0Ly8gRG9uJ3QgaGFuZGxlIGhhc2ggY2hhbmdlc1xuXHRpZiAodXJsLnBhdGhuYW1lID09PSBsb2NhdGlvbi5wYXRobmFtZSAmJiB1cmwuc2VhcmNoID09PSBsb2NhdGlvbi5zZWFyY2gpIHJldHVybjtcblxuXHRjb25zdCB0YXJnZXQgPSBzZWxlY3RfdGFyZ2V0KHVybCk7XG5cdGlmICh0YXJnZXQpIHtcblx0XHRjb25zdCBub3Njcm9sbCA9IGEuaGFzQXR0cmlidXRlKCdzYXBwZXItbm9zY3JvbGwnKTtcblx0XHRuYXZpZ2F0ZSh0YXJnZXQsIG51bGwsIG5vc2Nyb2xsLCB1cmwuaGFzaCk7XG5cdFx0ZXZlbnQucHJldmVudERlZmF1bHQoKTtcblx0XHRfaGlzdG9yeS5wdXNoU3RhdGUoeyBpZDogY2lkIH0sICcnLCB1cmwuaHJlZik7XG5cdH1cbn1cblxuZnVuY3Rpb24gd2hpY2goZXZlbnQpIHtcblx0cmV0dXJuIGV2ZW50LndoaWNoID09PSBudWxsID8gZXZlbnQuYnV0dG9uIDogZXZlbnQud2hpY2g7XG59XG5cbmZ1bmN0aW9uIGZpbmRfYW5jaG9yKG5vZGUpIHtcblx0d2hpbGUgKG5vZGUgJiYgbm9kZS5ub2RlTmFtZS50b1VwcGVyQ2FzZSgpICE9PSAnQScpIG5vZGUgPSBub2RlLnBhcmVudE5vZGU7IC8vIFNWRyA8YT4gZWxlbWVudHMgaGF2ZSBhIGxvd2VyY2FzZSBuYW1lXG5cdHJldHVybiBub2RlO1xufVxuXG5mdW5jdGlvbiBoYW5kbGVfcG9wc3RhdGUoZXZlbnQpIHtcblx0c2Nyb2xsX2hpc3RvcnlbY2lkXSA9IHNjcm9sbF9zdGF0ZSgpO1xuXG5cdGlmIChldmVudC5zdGF0ZSkge1xuXHRcdGNvbnN0IHVybCA9IG5ldyBVUkwobG9jYXRpb24uaHJlZik7XG5cdFx0Y29uc3QgdGFyZ2V0ID0gc2VsZWN0X3RhcmdldCh1cmwpO1xuXHRcdGlmICh0YXJnZXQpIHtcblx0XHRcdG5hdmlnYXRlKHRhcmdldCwgZXZlbnQuc3RhdGUuaWQpO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRsb2NhdGlvbi5ocmVmID0gbG9jYXRpb24uaHJlZjtcblx0XHR9XG5cdH0gZWxzZSB7XG5cdFx0Ly8gaGFzaGNoYW5nZVxuXHRcdHNldF91aWQodWlkICsgMSk7XG5cdFx0c2V0X2NpZCh1aWQpO1xuXHRcdF9oaXN0b3J5LnJlcGxhY2VTdGF0ZSh7IGlkOiBjaWQgfSwgJycsIGxvY2F0aW9uLmhyZWYpO1xuXHR9XG59XG5cbmZ1bmN0aW9uIHByZWZldGNoUm91dGVzKHBhdGhuYW1lcykge1xuXHRyZXR1cm4gcm91dGVzXG5cdFx0LmZpbHRlcihwYXRobmFtZXNcblx0XHRcdD8gcm91dGUgPT4gcGF0aG5hbWVzLnNvbWUocGF0aG5hbWUgPT4gcm91dGUucGF0dGVybi50ZXN0KHBhdGhuYW1lKSlcblx0XHRcdDogKCkgPT4gdHJ1ZVxuXHRcdClcblx0XHQucmVkdWNlKChwcm9taXNlLCByb3V0ZSkgPT4gcHJvbWlzZS50aGVuKCgpID0+IHtcblx0XHRcdHJldHVybiBQcm9taXNlLmFsbChyb3V0ZS5wYXJ0cy5tYXAocGFydCA9PiBwYXJ0ICYmIGxvYWRfY29tcG9uZW50KGNvbXBvbmVudHNbcGFydC5pXSkpKTtcblx0XHR9KSwgUHJvbWlzZS5yZXNvbHZlKCkpO1xufVxuXG5jb25zdCBzdG9yZXMkMSA9ICgpID0+IGdldENvbnRleHQoQ09OVEVYVF9LRVkpO1xuXG5leHBvcnQgeyBnb3RvLCBwcmVmZXRjaCwgcHJlZmV0Y2hSb3V0ZXMsIHN0YXJ0LCBzdG9yZXMkMSBhcyBzdG9yZXMgfTtcbiIsImltcG9ydCAqIGFzIHNhcHBlciBmcm9tICdAc2FwcGVyL2FwcCc7XG5cbnNhcHBlci5zdGFydCh7XG5cdHRhcmdldDogZG9jdW1lbnQucXVlcnlTZWxlY3RvcignI3NhcHBlcicpXG59KTsiXSwibmFtZXMiOlsiRXJyb3JDb21wb25lbnQiLCJkZXRhY2giLCJyb290X3ByZWxvYWQiLCJzYXBwZXIuc3RhcnQiXSwibWFwcGluZ3MiOiJBQUFBLFNBQVMsSUFBSSxHQUFHLEdBQUc7QUFFbkIsU0FBUyxNQUFNLENBQUMsR0FBRyxFQUFFLEdBQUcsRUFBRTtBQUMxQjtBQUNBLElBQUksS0FBSyxNQUFNLENBQUMsSUFBSSxHQUFHO0FBQ3ZCLFFBQVEsR0FBRyxDQUFDLENBQUMsQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUN4QixJQUFJLE9BQU8sR0FBRyxDQUFDO0FBQ2YsQ0FBQztBQUlELFNBQVMsWUFBWSxDQUFDLE9BQU8sRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLE1BQU0sRUFBRSxJQUFJLEVBQUU7QUFDekQsSUFBSSxPQUFPLENBQUMsYUFBYSxHQUFHO0FBQzVCLFFBQVEsR0FBRyxFQUFFLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxNQUFNLEVBQUUsSUFBSSxFQUFFO0FBQ3pDLEtBQUssQ0FBQztBQUNOLENBQUM7QUFDRCxTQUFTLEdBQUcsQ0FB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