Fuzzy = new () ->

  helpers =
    splitter: new RegExp(/\s*-|,|\s\s*/)

    get_search_substrings: (strings) ->
      collection = []
      for string in strings
        length = string.length
        string = string.split ""

        while 1 < length
          collection.push string.join ""
          string.pop()
          length--

      collection


    process_item: (item) ->
      search_str = _.uniq item.index_strings.join("|").toLowerCase().split("|")

      paths: search_str
      paths_index: @get_search_substrings search_str
      data: item


  levenstain = new () ->

    DistanceMatrix = () ->
      @matrix = {}
      @

    DistanceMatrix:: =
      set: (x, y, value) ->
        @matrix[ x + "_" + y ] = value

      get: (x, y) ->
        @matrix[ x + "_" + y ]


    operation_price: 1
    change_price: 1
    insert_delete_price: 2

    _change_price: (a, b) ->
      price = 0
      if((a is "" or b is "") and (a isnt b))
        price = @insert_delete_price
      else
        price = if a is b then 0 else 1

      price


    calculate: (string_x, string_y) ->
      @_calculate_length
        string_x: string_x
        string_y: string_y
        distances: new DistanceMatrix()
        stop: false


    _calculate_distance: (i, j, state) ->
      char_ix = state.string_x.charAt(i - 1)
      char_jy = state.string_y.charAt(j - 1)

      change_symbol_price = @_change_price char_ix, char_jy

      return state.distances.set 0, 0, 0 if(i is 0 and j is 0)
      return state.distances.set 0, j, j if(i is 0 and 0 < j)
      return state.distances.set i, 0, i if(j is 0 and 0 < i)

      a = state.distances.get(i - 1, j) + 1
      b = state.distances.get(i, j - 1) + 1
      c = state.distances.get(i - 1, j - 1) + change_symbol_price

      state.distances.set i, j, Math.min a, b, c


    _calculate_length: (state) ->
      x_length = state.string_x.length
      y_length = state.string_y.length

      @_calculate_distance 0, 0, state

      j = 1
      while(j <= y_length)
        @_calculate_distance 0, j, state
        j++

      i = 1
      while(i <= x_length)
        @_calculate_distance i, 0, state
        j = 1

        while(j <= y_length)
          @_calculate_distance i, j, state
          j++

        i++


      state.distances.get x_length, y_length

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


  SearchIndex = (raw_data, options) ->
    @options =
      min_string_length: options.min_string_length or @_default_options.min_string_length
      prices: options.prices or @_default_options.prices

    @paths = new StringsIndex()
    @tree = {}
    @_index = 0
    @add_items raw_data

    @

  SearchIndex.prototype:: =
    _default_options:
      min_string_length: 3
      prices:
        3: 0,
        5: 1,
        7: 2,
        20: 3

    add_items: (raw_items) ->
      batch.use(raw_data).each (raw_item) =>
        raw_item.index = @_index++
        item = helpers.process_item raw_item

        for path in item.paths
          @paths.add path
          if @options.min_string_length < path.length
            @_construct_path @tree, path.split(''), data

    _construct_path: (node, path_arr, data) ->
      for node_name in path_arr
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

    _leve_price: (term) ->
      length = term.length
      last_price = 0

      for word_length, price of @options.prices
        if word_length > length
          return last_price
        last_price = price

      last_price


    _check_array: (words, term, length_price) ->
      price = @_leve_price term

      selected = []

      for word, data of words
        if _.uniq((word + term).split "").length <= length_price
          selected.push(data) if levenstain.calculate(term, word) <= price

    _possible_values: (term) ->
      possible_paths = []
      term_length = term.length
      term_letters_count = _.uniq(term.split("")).length
      i = null

      for i in [-1...1]
        string_length = term_length + i
        search_words = @paths.get_items_by_length(string_length)
        length_price = term_letters_count + i + 1
        possible_paths.push @_check_array(search_words, term.substr(0, string_length), length_price)

      possible_paths

    _fuzzy_search: (term) ->
      values = @_possible_values(term)
      if values[1].length? then values[1] else _.flatten values

    _get_items: (paths) ->
      items = []

      for path in paths
        items.push @get_node(path.value).node.data

      _.uniq _.flatten items

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
