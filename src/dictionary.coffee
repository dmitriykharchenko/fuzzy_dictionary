Fuzzy = new () ->
  StringsList = () ->
    @list = {}
    @ 

  StringsList:: =
    add: (item) ->
      @list[item] =
        value: item

  StringsIndex = () ->
    @index = {}
    @

  StringsIndex:: =
    add: (item) ->
      length = item.length
      if not @index.hasOwnProperty length
        @index[length] = new StringsList()
      
      @index[length].add item

    get_items_by_length: (length) ->
      items = @index[length] or {}
      return items.list or {}

  helpers =
    splitter: new RegExp(/\s*-|,|\s\s*/)

    get_search_strings: (item) ->
      strings = item.index_strings.join("|").toLowerCase()
      return _.uniq(strings.split("|"))

    get_search_substrings: (strings) ->
      collection = []
      _.each strings, (string) =>
        @_string_substrings(collection, string)
      
      collection

    _string_substrings: (collection, string) ->
      length = string.length
      string = string.split ""

      while 1 < length
        collection.push string.join ""
        string.pop()
        length--

    process_item: (item) ->
      search_str = @get_search_strings item
      
      paths: search_str
      paths_index: @get_search_substrings search_str
      data: item


  SearchIndex = (raw_data, options) ->
    @options = _.extend {}, @_default_options, options
    @paths = new StringsIndex()
    @tree = {}
    @_index = 0
    @add_items raw_data

    @

  SearchIndex.prototype:: =
    _default_options: 
      min_string_length: 3

    add_items: (raw_items) ->
      batch.use(raw_data).each (raw_item) =>
        raw_item.index = @_index++
        item = helpers.process_item raw_item

        _.each item.paths, (path) =>
          @paths.add path
          if @options.min_string_length < path.length
            @_construct_path @tree, path.split(''), data

    _construct_path: (node, path_arr, data) ->
      _.each path_arr, (node_name) ->
        node[node_name] = node[node_name] or { data: [] }
        node = node[node_name]
        node.data.push data

    get_node: (path) ->
      return_data =
        node: null,
        status: "success",
        path: ""

      if not path
        return_data.status = "error"
        return return_data

      node_names = path.toLowerCase().split('')
      next_node_name = node_names.shift()
      node = @tree

      while true
        if not node[next_node_name]
          if next_node_name?
            return_data.path += next_node_name
            path_length = return_data.path.length
            return_data.status = "error"
          break
        
        return_data.path += next_node_name
        node = node[next_node_name]
        next_node_name = node_names.shift()
      
      return_data.node = node

      if eturn_data.status is "success" then return_data else null

    prices:
      3: 0,
      5: 1,
      7: 2,
      20: 3

    exact_search_price: 1

    _leve_price: (term) ->
      length = term.length
      last_price = 0

      _.detect @prices, (price, word_length) ->
        return true if word_length > length
        last_price = price
        return false
      
      last_price


    _check_array: (words, term, length_price) ->
      price = @_leve_price term
      _.select words, (data, word) ->
        if _.uniq((word + term).split("")).length <= length_price)
          M.utils.levenstain.calculate(term, word) <= price

    _possible_values: (term) ->
      possible_paths = []
      term_length = term.length
      term_letters_count = _.uniq(term.split("")).length
      i = null

      for i = -1 i < 1 i++
        string_length = term_length + i
        search_words = @paths.get_items_by_length(string_length)
        length_price = term_letters_count + i + 1
        possible_paths.push(@_check_array(search_words, term.substr(0, string_length), length_price))
      
      possible_paths

    _fuzzy_search: (term) ->
      values = @_possible_values(term)
      if values[1].length? then values[1] else _.flatten values

    _get_items: (paths) ->
      return _.uniq _.flatten _.map paths, (path) =>
        @get_node(path.value).node.data

    search: (term) ->
      @_get_items _.flatten @_possible_values term.toLowerCase()
    

  Dictionary = (@raw_list, @name) ->
    @index = new SearchIndex @raw_list
    @

  Dictionary:: =
    _is_iata_regexp: new RegExp /^[a-zA-Z]*$/

    search: (term) ->
      if term then @index.search(term) else null

    add_more_strings: (data) ->
      @index.add_items data


  (raw_array) ->
    new Dictionary raw_array