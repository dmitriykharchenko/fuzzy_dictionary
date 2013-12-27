var Fuzzy;

Fuzzy = new function() {
  var Dictionary, SearchIndex, StringsIndex, StringsList, helpers, levenstain;
  helpers = {
    splitter: new RegExp(/\s*-|,|\s\s*/),
    get_search_strings: function(item) {
      var strings;
      strings = item.index_strings.join("|").toLowerCase();
      return _.uniq(strings.split("|"));
    },
    get_search_substrings: function(strings) {
      var collection, length, string, _i, _len;
      collection = [];
      for (_i = 0, _len = strings.length; _i < _len; _i++) {
        string = strings[_i];
        length = string.length;
        string = string.split("");
        while (1 < length) {
          collection.push(string.join(""));
          string.pop();
          length--;
        }
      }
      return collection;
    },
    process_item: function(item) {
      var search_str;
      search_str = this.get_search_strings(item);
      return {
        paths: search_str,
        paths_index: this.get_search_substrings(search_str),
        data: item
      };
    }
  };
  levenstain = new function() {
    var DistanceMatrix;
    DistanceMatrix = function() {
      this.matrix = {};
      return this;
    };
    DistanceMatrix.prototype = {
      set: function(x, y, value) {
        return this.matrix[x + "_" + y] = value;
      },
      get: function(x, y) {
        return this.matrix[x + "_" + y];
      }
    };
    return {
      operation_price: 1,
      change_price: 1,
      insert_delete_price: 2,
      _change_price: function(a, b) {
        var price;
        price = 0;
        if ((a === "" || b === "") && (a !== b)) {
          price = this.insert_delete_price;
        } else {
          price = a === b ? 0 : 1;
        }
        return price;
      },
      calculate: function(string_x, string_y) {
        return this._calculate_length({
          string_x: string_x,
          string_y: string_y,
          distances: new DistanceMatrix(),
          stop: false
        });
      },
      _calculate_distance: function(i, j, state) {
        var a, b, c, change_symbol_price, char_ix, char_jy;
        char_ix = state.string_x.charAt(i - 1);
        char_jy = state.string_y.charAt(j - 1);
        change_symbol_price = this._change_price(char_ix, char_jy);
        if (i === 0 && j === 0) {
          return state.distances.set(0, 0, 0);
        }
        if (i === 0 && 0 < j) {
          return state.distances.set(0, j, j);
        }
        if (j === 0 && 0 < i) {
          return state.distances.set(i, 0, i);
        }
        a = state.distances.get(i - 1, j) + 1;
        b = state.distances.get(i, j - 1) + 1;
        c = state.distances.get(i - 1, j - 1) + change_symbol_price;
        return state.distances.set(i, j, Math.min(a, b, c));
      },
      _calculate_length: function(state) {
        var i, j, x_length, y_length;
        x_length = state.string_x.length;
        y_length = state.string_y.length;
        this._calculate_distance(0, 0, state);
        j = 1;
        while (j <= y_length) {
          this._calculate_distance(0, j, state);
          j++;
        }
        i = 1;
        while (i <= x_length) {
          this._calculate_distance(i, 0, state);
          j = 1;
          while (j <= y_length) {
            this._calculate_distance(i, j, state);
            j++;
          }
          i++;
        }
        return state.distances.get(x_length, y_length);
      }
    };
  };
  StringsList = function() {
    this.list = {};
    return this;
  };
  StringsList.prototype = {
    add: function(item) {
      return this.list[item] = {
        value: item
      };
    }
  };
  StringsIndex = function() {
    this.index = {};
    return this;
  };
  StringsIndex.prototype = {
    add: function(item) {
      var length;
      length = item.length;
      if (!this.index.hasOwnProperty(length)) {
        this.index[length] = new StringsList();
      }
      return this.index[length].add(item);
    },
    get_items_by_length: function(length) {
      var items;
      items = this.index[length] || {};
      return items.list || {};
    }
  };
  SearchIndex = function(raw_data, options) {
    this.options = _.extend({}, this._default_options, options);
    this.paths = new StringsIndex();
    this.tree = {};
    this._index = 0;
    this.add_items(raw_data);
    return this;
  };
  SearchIndex.prototype.prototype = {
    _default_options: {
      min_string_length: 3,
      prices: {
        3: 0,
        5: 1,
        7: 2,
        20: 3
      }
    },
    add_items: function(raw_items) {
      var _this = this;
      return batch.use(raw_data).each(function(raw_item) {
        var item;
        raw_item.index = _this._index++;
        item = helpers.process_item(raw_item);
        return _.each(item.paths, function(path) {
          _this.paths.add(path);
          if (_this.options.min_string_length < path.length) {
            return _this._construct_path(_this.tree, path.split(''), data);
          }
        });
      });
    },
    _construct_path: function(node, path_arr, data) {
      return _.each(path_arr, function(node_name) {
        node[node_name] = node[node_name] || {
          data: []
        };
        node = node[node_name];
        return node.data.push(data);
      });
    },
    get_node: function(path) {
      var next_node_name, node, node_names, path_length, return_data;
      return_data = {
        node: null,
        status: "success",
        path: ""
      };
      if (!path) {
        return_data.status = "error";
        return return_data;
      }
      node_names = path.toLowerCase().split('');
      next_node_name = node_names.shift();
      node = this.tree;
      while (true) {
        if (!node[next_node_name]) {
          if (next_node_name != null) {
            return_data.path += next_node_name;
            path_length = return_data.path.length;
            return_data.status = "error";
          }
          break;
        }
        return_data.path += next_node_name;
        node = node[next_node_name];
        next_node_name = node_names.shift();
      }
      return_data.node = node;
      if (eturn_data.status === "success") {
        return return_data;
      } else {
        return null;
      }
    },
    _leve_price: function(term) {
      var last_price, length;
      length = term.length;
      last_price = 0;
      _.detect(this.options.prices, function(price, word_length) {
        if (word_length > length) {
          return true;
        }
        last_price = price;
        return false;
      });
      return last_price;
    },
    _check_array: function(words, term, length_price) {
      var price;
      price = this._leve_price(term);
      return _.select(words, function(data, word) {
        if (_.uniq((word + term).split("")).length <= length_price) {
          return levenstain.calculate(term, word) <= price;
        }
      });
    },
    _possible_values: function(term) {
      var i, length_price, possible_paths, search_words, string_length, term_length, term_letters_count, _i;
      possible_paths = [];
      term_length = term.length;
      term_letters_count = _.uniq(term.split("")).length;
      i = null;
      for (i = _i = -1; _i < 1; i = ++_i) {
        string_length = term_length + i;
        search_words = this.paths.get_items_by_length(string_length);
        length_price = term_letters_count + i + 1;
        possible_paths.push(this._check_array(search_words, term.substr(0, string_length), length_price));
      }
      return possible_paths;
    },
    _fuzzy_search: function(term) {
      var values;
      values = this._possible_values(term);
      if (values[1].length != null) {
        return values[1];
      } else {
        return _.flatten(values);
      }
    },
    _get_items: function(paths) {
      var _this = this;
      return _.uniq(_.flatten(_.map(paths, function(path) {
        return _this.get_node(path.value).node.data;
      })));
    },
    search: function(term) {
      return this._get_items(_.flatten(this._possible_values(term.toLowerCase())));
    }
  };
  Dictionary = function(raw_list, name) {
    this.raw_list = raw_list;
    this.name = name;
    this.index = new SearchIndex(this.raw_list);
    return this;
  };
  Dictionary.prototype = {
    _is_iata_regexp: new RegExp(/^[a-zA-Z]*$/),
    search: function(term) {
      if (term) {
        return this.index.search(term);
      } else {
        return null;
      }
    },
    add_more_strings: function(data) {
      return this.index.add_items(data);
    }
  };
  return function(raw_array) {
    return new Dictionary(raw_array);
  };
};
