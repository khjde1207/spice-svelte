<script >
	import { onMount, tick, afterUpdate , onDestroy} from 'svelte'
	import { stores } from '@sapper/app';
	import { Button, Col, Row } from 'sveltestrap';
	import State from 'deep-state-observer'; 
	import axios from 'axios'

	let state = {};
	let subscribers = [];

	const { preloading, page, session } = stores();
	let SpiceHtml5 = null;
	let domspice; 


	onDestroy(() => {
		subscribers.forEach((unsubscribe) => unsubscribe());
	});
	async function asdf(){
		// var s = await axios.post('/data/loadscript')
		// console.log(s)
		console.log(state)

	}
	onMount(async () => { 
		
		const module = await import('/spice-html5/src/main.js'); 
		SpiceHtml5 = module;
		let  {url,port,password,}= $page.query

		if(url.indexOf('ws') < 0){
			url = 'ws://'+url;
		}
		if(password){ 
			let addressurl = location.search.replace(`&password=${password}` , '')
		
		}
		state = new SpiceHtml5.SpiceMainConn({uri: url+':'+port, screen_id: "spice-screen", password: password });
		 
		
		asdf();

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
	<link rel="stylesheet" href="https://stackpath.bootstrapcdn.com/bootstrap/4.3.1/css/bootstrap.min.css">
</svelte:head> 
<main> 
	<Row>
		<Col>
			<div id="spice-area">
				<div bind:this={domspice} id="spice-screen" class="spice-screen"></div>
			</div>
		</Col> 
		<Col>
			<Button color="primary" outline on:click={asdf} >ReLoadScript</Button>
		</Col>
	</Row>  
</main>
