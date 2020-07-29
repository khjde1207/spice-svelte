// import posts from './_posts.js';
import fs from 'fs'

// const contents = JSON.stringify(posts.map(post => {
// 	return {
// 		title: post.title, 
// 		slug: post.slug
// 	};
// }));

export function get(req, res) {
	res.writeHead(200, {
		'Content-Type': 'application/json'
	});
	let rtn = fs.readFileSync('./data/test.json', 'utf-8');
	console.log(rtn)
	res.end(rtn); 
}

export function post(req, res) {
	res.writeHead(200, {
		'Content-Type': 'application/json'
	});
	// let rtn = fs.writeFileSync('./data/test.json', 'utf-8');
	// console.log(rtn)
	res.end(`{"a" : "a"}`);
}