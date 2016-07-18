# Markdown to JSON converter

Easy conversion from markdown files to json, to create an index.

Later, you can inject the json into algolia search.

# Install

npm install markdown2json --save

# Usage

## Indexer

		var indexer = require("markdown2json").Indexer;

		indexer = new indexer(options);

		indexer.run().then(...);


"options" is a json with the following options:


* **dir**: String. directory to loop
* **domain**: String. http(s) domain to concat to the path
* **index_empty_content**: Boolean. if false, it won't add the md to the json if the content is empty
* **excludes**: Array of strings. Paths to avoid in the indexing


## Parser

		var parser = require("markdown2json").parseMD;

		parser(file, options).then(...)

where "options" is a json with the following options:

* **dir**: String. directory to replace the path with the domain
* **domain**: String. http(s) domain to concat to the path


# Example - loop over a content directory, for example, from gohugo static site generator

		var indexer = require("markdown2json").Indexer;

		var algoliasearch = require('algoliasearch');
		var client = algoliasearch('YOURAPP ID', 'MANAGEMENT API KEY');
		var algolia = client.initIndex('indexname');

		indexer = new indexer(
			{
				"dir" : "./content",
				"domain" : "http://yourdomain.com",
				"index_empty_content" : false, //if md content == "", is not indexed
				"excludes" : [
					"/path1/path2",
					"/path4"
				]
			}
		);

		indexer.run().then(
			function(idx){
				console.log(idx.length + " documents indexed");
				console.log("publishing to algolia...");
				algolia.saveObjects(idx, function(err, content) {
				  if(err===null){
					console.log("published!");
					algolia.deleteByQuery({
					  filters: 'NOT indexKey:"' + idx[0].indexKey + '"'
					}, function(err) {
						if (!err) {
						    console.log('old records deleted');
						}
					});
				  }else{
				  	console.error(err);
				  }
				});
			}	
		)

# Example - parse single file

		var parser = require("markdown2json").parseMD;

		//parser(filepath, setup)

		parser("./content/markdownfile.md", {
			"dir" : "./content",
			"domain" : "http://yourdomain.com",
		}).then(
			function(jsonObj){
				console.log(jsonObj)
			}
		)

