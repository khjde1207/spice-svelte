<script >
	import { onMount } from 'svelte'
	import { stores } from '@sapper/app';
	const { preloading, page, session } = stores();
	let SpiceHtml5 = null;
	onMount(async () => { 
		console.log(preloading,  $page.query, session) 
		const module = await import('/spice-html5/src/main.js');
		SpiceHtml5 = module;
		let  {url,port,password,}= $page.query
		// let param = new URLSearchParams(location.search)
		// let url = param.get('url') || 'localhost';
		// let port = param.get('port') || '5959';
		// let password = param.get('password') || '';
		if(url.indexOf('ws') < 0){
			url = 'ws://'+url;
		}
		if(password){ 
			let addressurl = location.search.replace(`&password=${password}` , '')
			// history.pushState({}, "", addressurl);
		}
		let sc = new SpiceHtml5.SpiceMainConn({uri: url+':'+port, screen_id: "spice-screen", password: password });

		
		// MyComponent = module.default;
	});
</script>

<style>
	#spice-area
	{ 
		height: 100%;
		width: 100%;
		padding: 0;
		margin-left: auto;
		margin-right: auto;
		border: solid #222222 1px;
		-webkit-box-shadow: 5px 5px 5px rgba(0, 0, 0, 0.2);
		-moz-box-shadow: 5px 5px 5px rgba(0, 0, 0, 0.2);
		box-shadow: 5px 5px 5px rgba(0, 0, 0, 0.2);
		-moz-border-radius: 10px;
		-webkit-border-radius: 10px;
		border-radius: 10px;
		text-align: center;
	}
	main { 
		
		padding: 1em;
		margin: 0 auto; 
	}

	h1 {
		color: #ff3e00;
		text-transform: uppercase;
		font-size: 4em;
		font-weight: 100;
	}
	/* .spice-screen{
		max-width: 300px;
	} */

	/* @media (min-width: 640px) {
		main {
			max-width: none;
		}
	} */
</style>

<svelte:head>
	<title>Sapper </title>
</svelte:head>
<main>
	<div id="spice-area">
		<div id="spice-screen" class="spice-screen"></div>
	</div>
</main>
