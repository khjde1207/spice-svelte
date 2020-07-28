import { S as SvelteComponentDev, i as init, d as dispatch_dev, s as safe_not_equal, a as stores$1, v as validate_store, c as component_subscribe, o as onMount, b as validate_slots, g as globals, e as space, f as element, q as query_selector_all, h as detach_dev, j as claim_space, k as claim_element, l as children, m as attr_dev, n as add_location, p as insert_dev, r as append_dev, t as noop, u as binding_callbacks } from './client.b1d03e65.js';

/* src/routes/index.svelte generated by Svelte v3.24.0 */

const { console: console_1 } = globals;
const file = "src/routes/index.svelte";

function create_fragment(ctx) {
	let t;
	let main;
	let div1;
	let div0;

	const block = {
		c: function create() {
			t = space();
			main = element("main");
			div1 = element("div");
			div0 = element("div");
			this.h();
		},
		l: function claim(nodes) {
			const head_nodes = query_selector_all("[data-svelte=\"svelte-1n29hcr\"]", document.head);
			head_nodes.forEach(detach_dev);
			t = claim_space(nodes);
			main = claim_element(nodes, "MAIN", { class: true });
			var main_nodes = children(main);
			div1 = claim_element(main_nodes, "DIV", { id: true, class: true });
			var div1_nodes = children(div1);
			div0 = claim_element(div1_nodes, "DIV", { id: true, class: true });
			children(div0).forEach(detach_dev);
			div1_nodes.forEach(detach_dev);
			main_nodes.forEach(detach_dev);
			this.h();
		},
		h: function hydrate() {
			document.title = "Sapper ";
			attr_dev(div0, "id", "spice-screen");
			attr_dev(div0, "class", "spice-screen");
			add_location(div0, file, 79, 2, 1755);
			attr_dev(div1, "id", "spice-area");
			attr_dev(div1, "class", "svelte-16arozt");
			add_location(div1, file, 78, 1, 1731);
			attr_dev(main, "class", "svelte-16arozt");
			add_location(main, file, 77, 0, 1723);
		},
		m: function mount(target, anchor) {
			insert_dev(target, t, anchor);
			insert_dev(target, main, anchor);
			append_dev(main, div1);
			append_dev(div1, div0);
			/*div0_binding*/ ctx[2](div0);
		},
		p: noop,
		i: noop,
		o: noop,
		d: function destroy(detaching) {
			if (detaching) detach_dev(t);
			if (detaching) detach_dev(main);
			/*div0_binding*/ ctx[2](null);
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

function instance($$self, $$props, $$invalidate) {
	let $page;
	const { preloading, page, session } = stores$1();
	validate_store(page, "page");
	component_subscribe($$self, page, value => $$invalidate(4, $page = value));
	let SpiceHtml5 = null;
	let domspice;

	onMount(async () => {
		// console.log(preloading,  $page.query, session) 
		const module = await import('../../../../../spice-html5/src/main.js');

		SpiceHtml5 = module;
		let { url, port, password } = $page.query;

		// let param = new URLSearchParams(location.search)
		// let url = param.get('url') || 'localhost';
		// let port = param.get('port') || '5959';
		// let password = param.get('password') || '';
		if (url.indexOf("ws") < 0) {
			url = "ws://" + url;
		}

		if (password) {
			let addressurl = location.search.replace(`&password=${password}`, "");
		} // history.pushState({}, "", addressurl);

		let sc = new SpiceHtml5.SpiceMainConn({
				uri: url + ":" + port,
				screen_id: "spice-screen",
				password
			});

		setTimeout(
			() => {
				console.log(domspice.children[0]);
			},
			200
		);
	}); // MyComponent = module.default;

	const writable_props = [];

	Object.keys($$props).forEach(key => {
		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console_1.warn(`<Routes> was created with unknown prop '${key}'`);
	});

	let { $$slots = {}, $$scope } = $$props;
	validate_slots("Routes", $$slots, []);

	function div0_binding($$value) {
		binding_callbacks[$$value ? "unshift" : "push"](() => {
			domspice = $$value;
			$$invalidate(0, domspice);
		});
	}

	$$self.$capture_state = () => ({
		onMount,
		stores: stores$1,
		preloading,
		page,
		session,
		SpiceHtml5,
		domspice,
		$page
	});

	$$self.$inject_state = $$props => {
		if ("SpiceHtml5" in $$props) SpiceHtml5 = $$props.SpiceHtml5;
		if ("domspice" in $$props) $$invalidate(0, domspice = $$props.domspice);
	};

	if ($$props && "$$inject" in $$props) {
		$$self.$inject_state($$props.$$inject);
	}

	return [domspice, page, div0_binding];
}

class Routes extends SvelteComponentDev {
	constructor(options) {
		super(options);
		init(this, options, instance, create_fragment, safe_not_equal, {});

		dispatch_dev("SvelteRegisterComponent", {
			component: this,
			tagName: "Routes",
			options,
			id: create_fragment.name
		});
	}
}

export default Routes;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguOGYyOTQ4ZjYuanMiLCJzb3VyY2VzIjpbIi4uLy4uLy4uL3NyYy9yb3V0ZXMvaW5kZXguc3ZlbHRlIl0sInNvdXJjZXNDb250ZW50IjpbIjxzY3JpcHQgPlxuXHRpbXBvcnQgeyBvbk1vdW50IH0gZnJvbSAnc3ZlbHRlJ1xuXHRpbXBvcnQgeyBzdG9yZXMgfSBmcm9tICdAc2FwcGVyL2FwcCc7XG5cdGNvbnN0IHsgcHJlbG9hZGluZywgcGFnZSwgc2Vzc2lvbiB9ID0gc3RvcmVzKCk7XG5cdGxldCBTcGljZUh0bWw1ID0gbnVsbDtcblx0bGV0IGRvbXNwaWNlOyBcblxuXHRvbk1vdW50KGFzeW5jICgpID0+IHsgXG5cdFx0XG5cdFx0Ly8gY29uc29sZS5sb2cocHJlbG9hZGluZywgICRwYWdlLnF1ZXJ5LCBzZXNzaW9uKSBcblx0XHRjb25zdCBtb2R1bGUgPSBhd2FpdCBpbXBvcnQoJy9zcGljZS1odG1sNS9zcmMvbWFpbi5qcycpO1xuXHRcdFNwaWNlSHRtbDUgPSBtb2R1bGU7XG5cdFx0bGV0ICB7dXJsLHBvcnQscGFzc3dvcmQsfT0gJHBhZ2UucXVlcnlcblx0XHQvLyBsZXQgcGFyYW0gPSBuZXcgVVJMU2VhcmNoUGFyYW1zKGxvY2F0aW9uLnNlYXJjaClcblx0XHQvLyBsZXQgdXJsID0gcGFyYW0uZ2V0KCd1cmwnKSB8fCAnbG9jYWxob3N0Jztcblx0XHQvLyBsZXQgcG9ydCA9IHBhcmFtLmdldCgncG9ydCcpIHx8ICc1OTU5Jztcblx0XHQvLyBsZXQgcGFzc3dvcmQgPSBwYXJhbS5nZXQoJ3Bhc3N3b3JkJykgfHwgJyc7XG5cdFx0aWYodXJsLmluZGV4T2YoJ3dzJykgPCAwKXtcblx0XHRcdHVybCA9ICd3czovLycrdXJsO1xuXHRcdH1cblx0XHRpZihwYXNzd29yZCl7IFxuXHRcdFx0bGV0IGFkZHJlc3N1cmwgPSBsb2NhdGlvbi5zZWFyY2gucmVwbGFjZShgJnBhc3N3b3JkPSR7cGFzc3dvcmR9YCAsICcnKVxuXHRcdFx0Ly8gaGlzdG9yeS5wdXNoU3RhdGUoe30sIFwiXCIsIGFkZHJlc3N1cmwpO1xuXHRcdH1cblx0XHRsZXQgc2MgPSBuZXcgU3BpY2VIdG1sNS5TcGljZU1haW5Db25uKHt1cmk6IHVybCsnOicrcG9ydCwgc2NyZWVuX2lkOiBcInNwaWNlLXNjcmVlblwiLCBwYXNzd29yZDogcGFzc3dvcmQgfSk7XG5cblx0XHRcblx0XHRzZXRUaW1lb3V0KCgpPT57XG5cdFx0XHRjb25zb2xlLmxvZyhkb21zcGljZS5jaGlsZHJlblswXSlcblx0XHR9LCAyMDApXG5cdFx0Ly8gTXlDb21wb25lbnQgPSBtb2R1bGUuZGVmYXVsdDtcblx0fSk7XG48L3NjcmlwdD5cblxuPHN0eWxlPlxuXHQjc3BpY2UtYXJlYVxuXHR7IFxuXHRcdGhlaWdodDogMTAwJTtcblx0XHR3aWR0aDogMTAwJTtcblx0XHRwYWRkaW5nOiAwO1xuXHRcdG1hcmdpbi1sZWZ0OiBhdXRvO1xuXHRcdG1hcmdpbi1yaWdodDogYXV0bztcblx0XHRib3JkZXI6IHNvbGlkICMyMjIyMjIgMXB4O1xuXHRcdC13ZWJraXQtYm94LXNoYWRvdzogNXB4IDVweCA1cHggcmdiYSgwLCAwLCAwLCAwLjIpO1xuXHRcdC1tb3otYm94LXNoYWRvdzogNXB4IDVweCA1cHggcmdiYSgwLCAwLCAwLCAwLjIpO1xuXHRcdGJveC1zaGFkb3c6IDVweCA1cHggNXB4IHJnYmEoMCwgMCwgMCwgMC4yKTtcblx0XHQtbW96LWJvcmRlci1yYWRpdXM6IDEwcHg7XG5cdFx0LXdlYmtpdC1ib3JkZXItcmFkaXVzOiAxMHB4O1xuXHRcdGJvcmRlci1yYWRpdXM6IDEwcHg7XG5cdFx0dGV4dC1hbGlnbjogY2VudGVyO1xuXHR9XG5cdG1haW4geyBcblx0XHRcblx0XHRwYWRkaW5nOiAxZW07XG5cdFx0bWFyZ2luOiAwIGF1dG87IFxuXHR9XG5cblx0aDEge1xuXHRcdGNvbG9yOiAjZmYzZTAwO1xuXHRcdHRleHQtdHJhbnNmb3JtOiB1cHBlcmNhc2U7XG5cdFx0Zm9udC1zaXplOiA0ZW07XG5cdFx0Zm9udC13ZWlnaHQ6IDEwMDtcblx0fVxuXHQvKiAuc3BpY2Utc2NyZWVue1xuXHRcdG1heC13aWR0aDogMzAwcHg7XG5cdH0gKi9cblxuXHQvKiBAbWVkaWEgKG1pbi13aWR0aDogNjQwcHgpIHtcblx0XHRtYWluIHtcblx0XHRcdG1heC13aWR0aDogbm9uZTtcblx0XHR9XG5cdH0gKi9cbjwvc3R5bGU+XG5cbjxzdmVsdGU6aGVhZD5cblx0PHRpdGxlPlNhcHBlciA8L3RpdGxlPlxuPC9zdmVsdGU6aGVhZD5cbjxtYWluPlxuXHQ8ZGl2IGlkPVwic3BpY2UtYXJlYVwiPlxuXHRcdDxkaXYgYmluZDp0aGlzPXtkb21zcGljZX0gaWQ9XCJzcGljZS1zY3JlZW5cIiBjbGFzcz1cInNwaWNlLXNjcmVlblwiPjwvZGl2PlxuXHQ8L2Rpdj5cbjwvbWFpbj5cbiJdLCJuYW1lcyI6WyJzdG9yZXMiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7U0FHUyxVQUFVLEVBQUUsSUFBSSxFQUFFLE9BQU8sS0FBS0EsUUFBTTs7O0tBQ3hDLFVBQVUsR0FBRyxJQUFJO0tBQ2pCLFFBQVE7O0NBRVosT0FBTzs7UUFHQSxNQUFNLGdCQUFnQix3Q0FBMEI7O0VBQ3RELFVBQVUsR0FBRyxNQUFNO1FBQ2IsR0FBRyxFQUFDLElBQUksRUFBQyxRQUFRLEtBQUksS0FBSyxDQUFDLEtBQUs7Ozs7OztNQUtuQyxHQUFHLENBQUMsT0FBTyxDQUFDLElBQUksSUFBSSxDQUFDO0dBQ3ZCLEdBQUcsR0FBRyxPQUFPLEdBQUMsR0FBRzs7O01BRWYsUUFBUTtPQUNOLFVBQVUsR0FBRyxRQUFRLENBQUMsTUFBTSxDQUFDLE9BQU8sY0FBYyxRQUFRLElBQUssRUFBRTs7O01BR2xFLEVBQUUsT0FBTyxVQUFVLENBQUMsYUFBYTtJQUFFLEdBQUcsRUFBRSxHQUFHLEdBQUMsR0FBRyxHQUFDLElBQUk7SUFBRSxTQUFTLEVBQUUsY0FBYztJQUFZLFFBQVE7OztFQUd2RyxVQUFVOztJQUNULE9BQU8sQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLFFBQVEsQ0FBQyxDQUFDOztHQUM3QixHQUFHOzs7Ozs7Ozs7Ozs7Ozs7R0FrRFUsUUFBUTs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7In0=