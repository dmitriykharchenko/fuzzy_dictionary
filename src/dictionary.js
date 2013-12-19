M("dictionary", function(M){
  var StringsList = function(){
    this.list = {};
  };
  StringsList.prototype = {
    add: function(item){
      this.list[item] = {
        value: item
      };
    }
  };
  var StringsIndex = function(){
    this.index = {};
  };
  StringsIndex.prototype = {
    add: function(item){
      var length = item.length;
      if(!this.index.hasOwnProperty(length)){
        this.index[length] = new StringsList();
      }
      this.index[length].add(item);
    },
    get_items_by_length: function(length){
      var items = this.index[length] || {};
      return items.list || {};
    }
  };

  var helpers = {
    splitter: new RegExp(/\s*-|,|\s\s*/),
    get_search_strings: function(item){
      var strings = item.index_strings.join("|").toLowerCase();
      return _.uniq(strings.split("|"));
    },
    get_search_substrings: function(strings){
      var self = this;
      var collection = [];
      _.each(strings, function(string){
        self._string_substrings(collection, string);
      });
      return collection;
    },
    _string_substrings: function(collection, string){
      var length = string.length;
      string = string.split("");
      while(1 < length){
        collection.push(string.join(""));
        string.pop();
        length --;
      }
    },
    process_item: function(item){
      var search_str = this.get_search_strings(item);
      return {
        paths: search_str,
        paths_index: this.get_search_substrings(search_str),
        data: item
      };
    }
  };

  var SearchTree = function(raw_data){
    this.paths = new StringsIndex();
    this.tree = {};
    this._index = 0;
    var self = this;


    // chunking big array for ie8
    var data_length = raw_data.length;
    var chunk_size = 200;
    var next_chunk_index = 0;
    var worker = null;
    var iterator = function(item){
      self.add_item(item);
    };

    while(next_chunk_index < data_length){
      if(!worker){
        worker = M.utils.worker({
          data: raw_data.slice(next_chunk_index, next_chunk_index + chunk_size),
          iterator: iterator
        });
      } else {
        worker.then({
          data: raw_data.slice(next_chunk_index, next_chunk_index + chunk_size),
          iterator: iterator
        });
      }
      next_chunk_index = Math.min(next_chunk_index + chunk_size, data_length);
    }
  };

  SearchTree.prototype = {
    add_item: function(raw_item){
      var self = this;
      raw_item.index = this._next_index();
      var item = helpers.process_item(raw_item);
      this._add_paths_to_index(item.paths_index);
      _.each(item.paths, function(path){
        self._add_path(path, item.data);
      });
    },
    _next_index: function(){
      return this._index++;
    },
    _add_paths_to_index: function(paths){
      var self = this;
      _.each(paths, function(term){
        self.paths.add(term);
      });
    },
    _add_path: function(path, data){
      if(path.length < 3 && _.isNumber(+path)){
        return;
      }
      this._construct_path(this.tree, path.split(''), data);
    },
    _construct_path: function(node, path_arr, data){
      _.each(path_arr, function(node_name){
        if(!node[node_name]){
          node[node_name] = {
            data: []
          };
        }
        node = node[node_name];
        node.data.push(data);
      });
    },
    get_node: function(path){
      var return_data = {
        node: null,
        status: "success",
        path: ""
      };
      if(!path){
        return_data.status = "error";
        return return_data;
      }
      var node_names = path.toLowerCase().split(''),
        next_node_name = node_names.shift(),
        node = this.tree;

      while(true){
        if(!node[next_node_name]){
          if(!!next_node_name){
            return_data.path += next_node_name;
            var path_length = return_data.path.length;
            return_data.status = "error";
          }
          break;
        }
        return_data.path += next_node_name;
        node = node[next_node_name];
        next_node_name = node_names.shift();
      }
      return_data.node = node;
      return return_data.status === "success" ? return_data : null;
    },
    prices: {
      3: 0,
      5: 1,
      7: 2,
      20: 3
    },
    exact_search_price: 1,
    _leve_price: function(term){
      var length = term.length,
        last_price = 0;
      _.detect(this.prices, function(price, word_length){
        if(word_length > length){
          return true;
        }
        last_price = price;
        return false;
      });
      return last_price;
    },
    _check_array: function(words, term, length_price){
      var price = this._leve_price(term);
      return _.select(words, function(data, word){
        if(_.uniq((word + term).split("")).length <= length_price){
          return M.utils.levenstain.calculate(term, word) <= price;
        }
      });
    },
    _possible_values: function(term){
      var possible_paths = [];
      var term_length = term.length;
      var term_letters_count = _.uniq(term.split("")).length;
      var i = null;
      for(i = -1; i < 1; i++){
        var string_length = term_length + i;
        var search_words = this.paths.get_items_by_length(string_length);
        var length_price = term_letters_count + i + 1;
        possible_paths.push(this._check_array(search_words, term.substr(0, string_length), length_price));
      }
      return possible_paths;
    },
    _fuzzy_search: function(term){
      var values = this._possible_values(term);
      return !!values[1].length ? values[1] : _.flatten(values);
    },
    _get_items: function(paths){
      var self = this;
      return _.uniq(_.flatten(_.map(paths, function(path){
        return self.get_node(path.value).node.data;
      })));
    },
    soft_fuzzy_search: function(term){
      var near_terms = _.flatten(this._possible_values(term.toLowerCase()));
      return this._get_items(near_terms);
    },
    strict_fuzzy_search: function(term, term_price){
      term = term.toLowerCase();
      var data = null;
      var result = this._fuzzy_search(term);
      if(term_price){
        result = _.select(result, function(path_data){
          return M.utils.levenstain.calculate(term, path_data.value) <= term_price;
        });
      }
      if(result.length < 5 && result.length !== 0){
        term = _.min(result, function(result_term){
          return M.utils.levenstain.calculate(term, result_term.value);
        }).value;
        data = this.get_node(term);
      }
      return data !== null ? data.node.data : [];
    },
    iata_search: function(term){
      term = term.toLowerCase();
      items = this.soft_fuzzy_search(term);
      var result = _.detect(items, function(item){
        return term === item.iata.toLowerCase();
      }) || null;
      return result;
    }
  };

  var Dictionary = function(raw_array, name){
    this.raw_list = raw_array;
    this.name = name;
    var self = this;
    this.tree = new SearchTree(raw_array);
  };
  Dictionary.prototype = {
    _is_iata_regexp: new RegExp(/^[a-zA-Z]*$/),
    _is_iata: function(term){
      return (term.length === 3 || term.length === 2) && this._is_iata_regexp.test(term);
    },
    strictly: function(term){
      return !!term ? this.tree.strict_fuzzy_search(term) : null;
    },
    softly: function(term){
      return !!term ? this.tree.soft_fuzzy_search(term) : null;
    },
    iata: function(iata){
      var data = this._is_iata(iata) ? this.tree.get_node(iata) : null;
      return data ? data.node.data[0] : null;
    },
    city: function(city_name){
      var data = this.tree.get_node(city_name);
      return data ? data.node.data[0] : null;
    },
    is_city: function(term){
      var result = this.strictly(term);
      return 0 < result.length;
    }
  };

  var cache = {};

  return function(raw_array, uniq_key){
    uniq_key = uniq_key || "iata";
    var id = M.utils.md5.hexdigest(_.reduce(raw_array, function(memo, elem){
      return memo + elem[uniq_key];
    }, ''));
    if(!cache[id]){
      cache[id] = new Dictionary(raw_array);
      cache[id].id = id;
    }
    return cache[id];
  };
}, {
  require: ["utils.worker",
            "utils.levenstain",
            "utils.md5"]
});