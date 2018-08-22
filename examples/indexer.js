var indexer = require("../index").Indexer; //markdown2json
var fs = require("fs");
var request = require('request');

var _indexPath = "./index/"; //read index from and write to...

var indexSetup = {
	"dir" : "./content/",
	"cleanMD" : true,
	"index_empty_content" : false,
	"excludes" : []
}

indexer = new indexer(indexSetup);

if (!fs.existsSync(_indexPath)){
    fs.mkdirSync(_indexPath);
}

// creates index from markdown content
indexer.run().then(

	function(_newIdx){
		//reads old index
		var _readedIndex = readFile(_indexPath+"index.json");	
		try{
			_readedIndex = JSON.parse(_readedIndex);
		}catch(e){
			//...
		}

		//compare index, to insert or delete (update is a new insert)
		var compare = compareIndexs(_readedIndex, _newIdx);
		console.log("INSERT: " + compare.index.length)
		console.log("DELETE: " + compare.del.length)		

		if(!compare || compare.index.length>0 || compare.del.length>0){
			saveIndexLocal(_indexPath+"index.json", _newIdx);
		}

		if(compare.index.length>0){
			//algolia
			saveAlgolia(compare.index);
			//azure
			saveAzure(compare.index);
		}

		if(compare.del.length>0){
			//algolia
			deleteAlgolia(compare.del);
			deleteAzure(compare.del);
		}

	}

).catch(
	function(err){
		console.log(err);
	}
);


// HELPERS

/* Compare new index with oldest and get files to insert and to delete */
function compareIndexs(_oldIdx, _newIdx){
	var compareObj;
	var toIndex = [];
	var toDelete = [];

	if(!_oldIdx){
		return {index:_newIdx, del:[]};
	}

	for(var i=0,z=_newIdx.length;i<z;i++){
		compareObj = _newIdx[i];
		delete compareObj.indexTime;
		if((JSON.stringify(_oldIdx[compareObj.objectID])==JSON.stringify(compareObj))===false){
			toIndex.push(_newIdx[i]);
		}
		if(_oldIdx[compareObj.objectID]){
			_oldIdx[compareObj.objectID].processed = true;
		}
	}

	for(var k in _oldIdx){
		if(!_oldIdx[k].processed){
			toDelete.push(_oldIdx[k].path);
		}		
	}

	return {index:toIndex, del:toDelete};
}

/* Reads file sync  */
function readFile(file, data){
	try{
		return fs.readFileSync(file);
	}catch(e){
		return null;
	}
}

/* Saves index locally to compare new index processes */
function saveIndexLocal(file, data){
	console.log("saving new index locally");
	var compareIdx = {}; 
	for(var i=0,z=data.length;i<z;i++){
		delete data[i].indexTime
		compareIdx[data[i].objectID] = data[i];
	}
	fs.writeFileSync(file, JSON.stringify(compareIdx));
}

/********************* 
	ALGOLIA 
**********************/
var algoliasearch = require('algoliasearch');
var client = algoliasearch('X6GHXEQ01H', process.env.ALGOLIA_API_KEY);
var algolia = client.initIndex('ssg-huguoc');

algolia.setSettings({
	'removeStopWords':[true,'ca']
});

/* Saves index to Algolia */
function saveAlgolia(idx){
	if(!process.env.ALGOLIA_API_KEY){
		return;
	}
	algolia.saveObjects(idx, function(err, content) {
  		if(err===null && idx.length>0){
			console.log("new content published to Algolia!");
		}else if(idx.length===0){
			console.log("nothing to publish!");
		}else{
			console.log(err);
		}	
	});	
}

/* Delete files from algolia */
function deleteAlgolia(idx){
	if(!process.env.ALGOLIA_API_KEY){
		return;
	}
	idx.map(function(_file){
		algolia.deleteObject(new Buffer(_file).toString('base64'), function(err) {
			if (!err) {
				console.log(_file + ' deleted');
			}
		});			
	});			
}


/********************* 
  AZURE CLOUD SEARCH 
**********************/
var AzureSearch = require('azure-search');
var client = AzureSearch({
	url: "https://" + process.env.AZURE_SEARCH_SERVICE + ".search.windows.net",
	key: process.env.AZURE_SEARCH_API_KEY
});

var azureIndexName = "prova";


function updateSchema(idx, name){
	var schema = {};
	var processed = {};
	var setup = {};

	schema.name = name;
	schema.fields = [];
 	schema.corsOptions = {  
    	"allowedOrigins": ["*"]
  	}  

	idx = idx.map(function(item){
		for(var key in item){
			//item[key] += "";
			setup = {
					'name' : key,
					'type': 'Edm.String',
					'searchable': true,
					'filterable': true,
					'retrievable': true,
					'sortable': true,
					'facetable': true,
			};
			if(item[key]*1===item[key]){
				setup.type = 'Edm.Int32';
				setup.searchable = false;
								
			}
			if(key==="id"){
				setup.key = true;
			}
			if(!processed[key]){
				processed[key] = 1;
				schema.fields.push(setup);
			}
		}
		return item;
	});

	var updateIndex = function(){
		client.updateIndex(name, schema, function(err){
			if(err){
				console.log("error creating/updating index");
				console.log(err);
			}
		});	
	};

	client.deleteIndex(name, function(){
		updateIndex();
	})
}

function saveAzure(idx){
	if(!process.env.AZURE_SEARCH_API_KEY){
		return;
	}

	idx = idx.map(function(item){
		item.id = item.objectID;
		delete item.objectID;
		delete item.indexTime;
		return item;
	});	

	updateSchema(idx, azureIndexName);

	//console.log(idx[0])
	client.addDocuments(azureIndexName, idx, function(err, results){
		if(err===null){
			console.log("new content published to Azure!");
		}
	});
}

function deleteAzure(idx){
	if(!process.env.AZURE_SEARCH_API_KEY){
		return;
	}
	var idx = idx.map(function(item){
		console.log(item)
		return {'id':new Buffer(item).toString('base64')};
	});			

	client.deleteDocuments(azureIndexName, idx, function(err, results){
		console.log(err)
	})

}
