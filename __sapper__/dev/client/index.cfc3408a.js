import { S as SvelteComponentDev, i as init, d as dispatch_dev, s as safe_not_equal, a as stores$1, v as validate_store, c as component_subscribe, o as onMount, b as validate_slots, g as globals, e as space, f as element, q as query_selector_all, h as detach_dev, j as claim_space, k as claim_element, l as children, m as attr_dev, n as add_location, p as insert_dev, r as append_dev, t as noop } from './client.b7e27a24.js';

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
			add_location(div0, file, 73, 2, 1666);
			attr_dev(div1, "id", "spice-area");
			attr_dev(div1, "class", "svelte-16arozt");
			add_location(div1, file, 72, 1, 1642);
			attr_dev(main, "class", "svelte-16arozt");
			add_location(main, file, 71, 0, 1634);
		},
		m: function mount(target, anchor) {
			insert_dev(target, t, anchor);
			insert_dev(target, main, anchor);
			append_dev(main, div1);
			append_dev(div1, div0);
		},
		p: noop,
		i: noop,
		o: noop,
		d: function destroy(detaching) {
			if (detaching) detach_dev(t);
			if (detaching) detach_dev(main);
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
	component_subscribe($$self, page, value => $$invalidate(2, $page = value));
	let SpiceHtml5 = null;

	onMount(async () => {
		console.log(preloading, $page.query, session);
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
	}); // MyComponent = module.default;

	const writable_props = [];

	Object.keys($$props).forEach(key => {
		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console_1.warn(`<Routes> was created with unknown prop '${key}'`);
	});

	let { $$slots = {}, $$scope } = $$props;
	validate_slots("Routes", $$slots, []);

	$$self.$capture_state = () => ({
		onMount,
		stores: stores$1,
		preloading,
		page,
		session,
		SpiceHtml5,
		$page
	});

	$$self.$inject_state = $$props => {
		if ("SpiceHtml5" in $$props) SpiceHtml5 = $$props.SpiceHtml5;
	};

	if ($$props && "$$inject" in $$props) {
		$$self.$inject_state($$props.$$inject);
	}

	return [page];
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguY2ZjMzQwOGEuanMiLCJzb3VyY2VzIjpbIi4uLy4uLy4uL3NyYy9yb3V0ZXMvaW5kZXguc3ZlbHRlIl0sInNvdXJjZXNDb250ZW50IjpbIjxzY3JpcHQgPlxuXHRpbXBvcnQgeyBvbk1vdW50IH0gZnJvbSAnc3ZlbHRlJ1xuXHRpbXBvcnQgeyBzdG9yZXMgfSBmcm9tICdAc2FwcGVyL2FwcCc7XG5cdGNvbnN0IHsgcHJlbG9hZGluZywgcGFnZSwgc2Vzc2lvbiB9ID0gc3RvcmVzKCk7XG5cdGxldCBTcGljZUh0bWw1ID0gbnVsbDtcblx0b25Nb3VudChhc3luYyAoKSA9PiB7IFxuXHRcdGNvbnNvbGUubG9nKHByZWxvYWRpbmcsICAkcGFnZS5xdWVyeSwgc2Vzc2lvbikgXG5cdFx0Y29uc3QgbW9kdWxlID0gYXdhaXQgaW1wb3J0KCcvc3BpY2UtaHRtbDUvc3JjL21haW4uanMnKTtcblx0XHRTcGljZUh0bWw1ID0gbW9kdWxlO1xuXHRcdGxldCAge3VybCxwb3J0LHBhc3N3b3JkLH09ICRwYWdlLnF1ZXJ5XG5cdFx0Ly8gbGV0IHBhcmFtID0gbmV3IFVSTFNlYXJjaFBhcmFtcyhsb2NhdGlvbi5zZWFyY2gpXG5cdFx0Ly8gbGV0IHVybCA9IHBhcmFtLmdldCgndXJsJykgfHwgJ2xvY2FsaG9zdCc7XG5cdFx0Ly8gbGV0IHBvcnQgPSBwYXJhbS5nZXQoJ3BvcnQnKSB8fCAnNTk1OSc7XG5cdFx0Ly8gbGV0IHBhc3N3b3JkID0gcGFyYW0uZ2V0KCdwYXNzd29yZCcpIHx8ICcnO1xuXHRcdGlmKHVybC5pbmRleE9mKCd3cycpIDwgMCl7XG5cdFx0XHR1cmwgPSAnd3M6Ly8nK3VybDtcblx0XHR9XG5cdFx0aWYocGFzc3dvcmQpeyBcblx0XHRcdGxldCBhZGRyZXNzdXJsID0gbG9jYXRpb24uc2VhcmNoLnJlcGxhY2UoYCZwYXNzd29yZD0ke3Bhc3N3b3JkfWAgLCAnJylcblx0XHRcdC8vIGhpc3RvcnkucHVzaFN0YXRlKHt9LCBcIlwiLCBhZGRyZXNzdXJsKTtcblx0XHR9XG5cdFx0bGV0IHNjID0gbmV3IFNwaWNlSHRtbDUuU3BpY2VNYWluQ29ubih7dXJpOiB1cmwrJzonK3BvcnQsIHNjcmVlbl9pZDogXCJzcGljZS1zY3JlZW5cIiwgcGFzc3dvcmQ6IHBhc3N3b3JkIH0pO1xuXG5cdFx0XG5cdFx0Ly8gTXlDb21wb25lbnQgPSBtb2R1bGUuZGVmYXVsdDtcblx0fSk7XG48L3NjcmlwdD5cblxuPHN0eWxlPlxuXHQjc3BpY2UtYXJlYVxuXHR7IFxuXHRcdGhlaWdodDogMTAwJTtcblx0XHR3aWR0aDogMTAwJTtcblx0XHRwYWRkaW5nOiAwO1xuXHRcdG1hcmdpbi1sZWZ0OiBhdXRvO1xuXHRcdG1hcmdpbi1yaWdodDogYXV0bztcblx0XHRib3JkZXI6IHNvbGlkICMyMjIyMjIgMXB4O1xuXHRcdC13ZWJraXQtYm94LXNoYWRvdzogNXB4IDVweCA1cHggcmdiYSgwLCAwLCAwLCAwLjIpO1xuXHRcdC1tb3otYm94LXNoYWRvdzogNXB4IDVweCA1cHggcmdiYSgwLCAwLCAwLCAwLjIpO1xuXHRcdGJveC1zaGFkb3c6IDVweCA1cHggNXB4IHJnYmEoMCwgMCwgMCwgMC4yKTtcblx0XHQtbW96LWJvcmRlci1yYWRpdXM6IDEwcHg7XG5cdFx0LXdlYmtpdC1ib3JkZXItcmFkaXVzOiAxMHB4O1xuXHRcdGJvcmRlci1yYWRpdXM6IDEwcHg7XG5cdFx0dGV4dC1hbGlnbjogY2VudGVyO1xuXHR9XG5cdG1haW4geyBcblx0XHRcblx0XHRwYWRkaW5nOiAxZW07XG5cdFx0bWFyZ2luOiAwIGF1dG87IFxuXHR9XG5cblx0aDEge1xuXHRcdGNvbG9yOiAjZmYzZTAwO1xuXHRcdHRleHQtdHJhbnNmb3JtOiB1cHBlcmNhc2U7XG5cdFx0Zm9udC1zaXplOiA0ZW07XG5cdFx0Zm9udC13ZWlnaHQ6IDEwMDtcblx0fVxuXHQvKiAuc3BpY2Utc2NyZWVue1xuXHRcdG1heC13aWR0aDogMzAwcHg7XG5cdH0gKi9cblxuXHQvKiBAbWVkaWEgKG1pbi13aWR0aDogNjQwcHgpIHtcblx0XHRtYWluIHtcblx0XHRcdG1heC13aWR0aDogbm9uZTtcblx0XHR9XG5cdH0gKi9cbjwvc3R5bGU+XG5cbjxzdmVsdGU6aGVhZD5cblx0PHRpdGxlPlNhcHBlciA8L3RpdGxlPlxuPC9zdmVsdGU6aGVhZD5cbjxtYWluPlxuXHQ8ZGl2IGlkPVwic3BpY2UtYXJlYVwiPlxuXHRcdDxkaXYgaWQ9XCJzcGljZS1zY3JlZW5cIiBjbGFzcz1cInNwaWNlLXNjcmVlblwiPjwvZGl2PlxuXHQ8L2Rpdj5cbjwvbWFpbj5cbiJdLCJuYW1lcyI6WyJzdG9yZXMiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O1NBR1MsVUFBVSxFQUFFLElBQUksRUFBRSxPQUFPLEtBQUtBLFFBQU07OztLQUN4QyxVQUFVLEdBQUcsSUFBSTs7Q0FDckIsT0FBTztFQUNOLE9BQU8sQ0FBQyxHQUFHLENBQUMsVUFBVSxFQUFHLEtBQUssQ0FBQyxLQUFLLEVBQUUsT0FBTztRQUN2QyxNQUFNLGdCQUFnQix3Q0FBMEI7RUFDdEQsVUFBVSxHQUFHLE1BQU07UUFDYixHQUFHLEVBQUMsSUFBSSxFQUFDLFFBQVEsS0FBSSxLQUFLLENBQUMsS0FBSzs7Ozs7O01BS25DLEdBQUcsQ0FBQyxPQUFPLENBQUMsSUFBSSxJQUFJLENBQUM7R0FDdkIsR0FBRyxHQUFHLE9BQU8sR0FBQyxHQUFHOzs7TUFFZixRQUFRO09BQ04sVUFBVSxHQUFHLFFBQVEsQ0FBQyxNQUFNLENBQUMsT0FBTyxjQUFjLFFBQVEsSUFBSyxFQUFFOzs7TUFHbEUsRUFBRSxPQUFPLFVBQVUsQ0FBQyxhQUFhO0lBQUUsR0FBRyxFQUFFLEdBQUcsR0FBQyxHQUFHLEdBQUMsSUFBSTtJQUFFLFNBQVMsRUFBRSxjQUFjO0lBQVksUUFBUTs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7In0=
