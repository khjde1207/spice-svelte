<script >
	import { onMount, tick, afterUpdate , onDestroy} from 'svelte'
	import { stores } from '@sapper/app';
	import { Button, Col, Row } from 'sveltestrap';
	import State from 'deep-state-observer'; 
	import axios from 'axios'

	let state = {};
	let subscribers = [];

	let Messages = {};
	let Constants = {};

	const { preloading, page, session } = stores();
	let SpiceHtml5 = null;
	let domspice; 


	onDestroy(() => {
		subscribers.forEach((unsubscribe) => unsubscribe());
	});
	async function asdf(){
		let keydown = new KeyboardEvent('keydown',{type: "keydown", code: "KeyW" , key: "w", keyCode: 87})
		var key = new Messages.SpiceMsgcKeyDown(keydown)
		var msg = new Messages.SpiceMiniData();
		msg.build_msg(Constants.SPICE_MSGC_INPUTS_KEY_DOWN, key); 
		// console.log(msg, Constants)
		// state.inputs.send_msg(msg);
		console.log(state.inputs.state)
		let keyup = new KeyboardEvent('keyup',{type: "keyup" ,code: "KeyW" , key: "w", keyCode: 87})
		var key = new Messages.SpiceMsgcKeyDown(keyup)
		var msg = new Messages.SpiceMiniData();
		msg.build_msg(Constants.SPICE_MSGC_INPUTS_KEY_UP, key);
		// check_and_update_modifiers(keydown, key.code, this.sc);
		state.inputs.send_msg(msg);
		console.log(msg)
		
		// console.log(msg)
		// msg.build_msg(Constants.SPICE_MSGC_INPUTS_KEY_DOWN, key);
		// if (this.sc && this.sc.inputs && this.sc.inputs.state === "ready")

// 		code: "KeyW"
// composed: true
// ctrlKey: false
// currentTarget: canvas#spice_surface_0
// defaultPrevented: false
// detail: 0
// eventPhase: 2
// isComposing: false
// isTrusted: true
// key: "w"
// keyCode: 87
		// console.log('>>>>>>>: ' , message.SpiceMsgcKeyDown)
		// var s = await axios.post('/data/loadscript')
		// var buffer = new ArrayBuffer(4);
		// var uint8View = new Uint8Array(buffer);
		// uint8View[0] = 31;
		// temp1.inputs.send_msg({type: 101 ,size: 4 ,data :buffer})
		// {type: 101 ,size: 4 ,data :buffer}
		// console.log(s)
// 		data: ArrayBuffer(4)
// [[Int8Array]]: Int8Array(4) [31, 0, 0, 0]
// [[Int16Array]]: Int16Array(2) [31, 0]
// [[Int32Array]]: Int32Array [31]
// [[Uint8Array]]: Uint8Array(4) [31, 0, 0, 0]
// byteLength: (...)
// __proto__: ArrayBuffer
// size: 4
// type: 101
		// console.log(state)

	}
	onMount(async () => {  
		
		const module = await import('/spice-html5/src/main.js'); 
		Messages = await import('/spice-html5/src/spicemsg.js'); 
		Constants = await import('/spice-html5/src/enums.js'); 
		Constants = Constants.Constants

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
		/* height: 100%; */
		/* width: 100%; */
		/* padding: 0; */
		/* margin-left: auto;
		margin-right: auto; */
		/* border: solid #222222 1px; */
		/* -webkit-box-shadow: 5px 5px 5px rgba(0, 0, 0, 0.2);
		-moz-box-shadow: 5px 5px 5px rgba(0, 0, 0, 0.2);
		box-shadow: 5px 5px 5px rgba(0, 0, 0, 0.2); */
		/* -moz-border-radius: 10px;
		-webkit-border-radius: 10px; */
		/* border-radius: 10px; */
		/* text-align: center; */
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
	<Row>
	</Row>
</main>
