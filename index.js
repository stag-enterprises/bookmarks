import { $ } from "bun";

import { JSDOM } from "jsdom";
import { stringify } from "yaml";

const SITE_TITLE = "bookmarks";

const getName = i => i.querySelector("title").textContent;
const getItems = i => Array.from(i.children).filter(ii => ii.tagName === "BOOKMARK" || ii.tagName === "FOLDER");
const parseFolder = i => ({
	name: getName(i),
	type: "folder",
	content: getItems(i).map(ii =>
		ii.tagName === "FOLDER" ? parseFolder(ii) : {
			name: getName(ii),
			type: "bookmark",
			content: ii.getAttribute("href"),
		}),
});

const byType = i => ii => ii.type === i;
const indent = i => [...i.filter(byType("folder")), ...i.some(byType("bookmark")) ? [{
	name: "uncategorized",
	type: "folder",
	content: i.filter(byType("bookmark"))
}] : []];
const toStaticMark = i => i.map(ii => ({
	[ii.name]: ii.content.map(iii => ({
		[iii.name]: iii.type === "folder" ? iii.content.map(iv => iv.content) : iii.content,
	})),
}));

const xbel = new JSDOM(await Bun.file("./bookmarks.xbel").text()).window.document.querySelector("xbel");
const bookmarksSortless = getItems(xbel).map(parseFolder);
const shouldBeLast = i => i.name.includes("/");
const bookmarks = [...bookmarksSortless.filter(i => !shouldBeLast(i)), ...bookmarksSortless.filter(shouldBeLast)];

await $`mkdir -p ./bookmarks && rm -r ./bookmarks && mkdir ./bookmarks`;
for (let i of indent(bookmarks)) await Bun.write(`./bookmarks/${i.name}.yml`, stringify({ [i.name]: toStaticMark(indent(i.content)) }));
await $`bunx static-marks build ./bookmarks/*.yml -t ${SITE_TITLE} > ./bookmarks/index.html`;

