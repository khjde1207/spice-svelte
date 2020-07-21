<script>
	// export let name;
	import {onMount} from 'svelte'
	import * as utils from './spice-html5/src/utils.js';
	import * as SpiceHtml5 from './spice-html5/src/main.js';

	console.log(utils)
	//, onerror: spice_error, onagent: agent_connected
	onMount(() => {
		let sc = new SpiceHtml5.SpiceMainConn({uri: "ws://localhost:5959", screen_id: "spice-screen", password: '' });
		console.log(sc)
	})
</script>

<main>
	<div id="spice-area">
		<div id="spice-screen" class="spice-screen"></div>
	</div>
</main>

<style>
	#spice-area
	{
		height: 100%;
		width: 95%;
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
	}
	main { 
		text-align: center;
		padding: 1em;
		max-width: 240px;
		margin: 0 auto; 
	}

	h1 {
		color: #ff3e00;
		text-transform: uppercase;
		font-size: 4em;
		font-weight: 100;
	}

	@media (min-width: 640px) {
		main {
			max-width: none;
		}
	}
</style>