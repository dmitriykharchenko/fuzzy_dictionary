describe('mangra events spec', function(){

  describe('Bumps', function(){
    var new_event = null;
    var spy = null;

    beforeEach(function(){
      mangra.list = {};
      new_event = mangra.create("event");
      spy = jasmine.createSpy('spy');
      jasmine.Clock.useMock();
    });

    it("mangra should create a Bump instance and save ref to it", function(){
      expect(mangra.list.event).toBe(new_event);
      expect(new_event.name).toBe("event");
      expect(new_event._handlers.length).toBe(0);
      expect(new_event._last_params).toBe(null);

      expect(new_event._handlers_caller).toBeDefined();
      expect(new_event.on).toBeDefined();
      expect(new_event.off).toBeDefined();
      expect(new_event.fire).toBeDefined();
    });

    it("mangra should create a Bump instance, without ref saving", function(){
      mangra.forget("event");
      new_event = mangra.create();

      expect(mangra.list).toEqual({});

      expect(new_event.name).toBe(undefined);
      expect(new_event._handlers.length).toBe(0);
      expect(new_event._last_params).toBe(null);

      expect(new_event._handlers_caller).toBeDefined();
      expect(new_event.on).toBeDefined();
      expect(new_event.off).toBeDefined();
      expect(new_event.fire).toBeDefined();
    });

    it("should bind handler", function(){
      
      var options = {};
      var context = {};

      new_event.on(spy, context, options);

      id = new_event._id;

      expect(new_event._handlers.length).toBe(1);
      expect(new_event._handlers[0]).toBe(spy);
      expect(new_event._handlers[0].event_data.id).toBeDefined();
      expect(new_event._handlers[0].event_data[id].options).toBe(options);
      expect(new_event._handlers[0].event_data[id].context).toBe(context);
    });

    it("should unbind handler", function(){
      var options = {};
      var context = {};

      new_event.on(spy);
      expect(new_event._handlers.length).toBe(1);

      new_event.off(spy);

      new_event.fire();
      jasmine.Clock.tick(1000);

      expect(new_event._handlers.length).toBe(0);
      expect(spy).not.toHaveBeenCalled();
      expect(spy.event_data[new_event._id]).not.toBeDefined(true);
    });

    it("should fire binded handlers", function(){
      var another_spy = jasmine.createSpy('another_spy');
      var options = {};
      var context = {};

      new_event.on(spy);
      new_event.on(another_spy);
      new_event.off(another_spy);

      new_event.fire();

      jasmine.Clock.tick(1000);

      expect(spy).toHaveBeenCalled();
      expect(another_spy).not.toHaveBeenCalled();
    });

    it("handlers should be called in context, if specified", function(){
      var handler_context = null;
      var handler = function(){
        handler_context = this;
      };
      var options = {};
      var context = {
        foo: "bar"
      };

      new_event.on(handler, context);
      new_event.fire();

      jasmine.Clock.tick(1000);

      expect(handler_context).toBe(context);
    });

    it("handlers should be called in different contexts for different events, if specified", function(){
      var handler_context = null;
      var another_new_event = mangra.create('another_event');

      var handler = function(){
        handler_context = this;
      };

      var options = {};

      var context_one = {
        foo: "bar"
      };

      var context_two = {
        foo: "bar"
      };

      new_event.on(handler, context_one);
      another_new_event.on(handler, context_two);
      new_event.fire();
      jasmine.Clock.tick(1000);

      expect(handler_context).toBe(context_one);

      another_new_event.fire();
      jasmine.Clock.tick(1000);
      expect(handler_context).toBe(context_two);
    });

    it("handler should be called immediately if option 'recall' is set and event was fired before", function(){
      var options = {
        recall: true
      };

      new_event.fire({'foo': 'bar'});

      jasmine.Clock.tick(1000);

      new_event.on(spy, {}, options);

      expect(spy).toHaveBeenCalled();
    });

    it("handler should should receive data from event", function(){
      var event_data = {'foo': 'bar'};

      new_event.on(spy);
      new_event.fire(event_data);

      jasmine.Clock.tick(1000);
      
      expect(spy).toHaveBeenCalled();
      expect(spy.mostRecentCall.args.length).toBe(2);
      expect(spy.mostRecentCall.args[0]).toBe(event_data);
    });

    it("handler should should receive data from event in different args when it send as array", function(){
      var event_data = [{'foo': 'bar'}, {"bar": "foo"}];

      new_event.on(spy);
      new_event.fire(event_data);

      jasmine.Clock.tick(1000);
      
      expect(spy).toHaveBeenCalled();
      expect(spy.mostRecentCall.args.length).toBe(3);
      expect(spy.mostRecentCall.args[0]).toBe(event_data[0]);
      expect(spy.mostRecentCall.args[1]).toBe(event_data[1]);
    });
  });


  describe('Scape', function(){

    beforeEach(function(){
      mangra.list = {};
      jasmine.Clock.useMock();
    });

    describe("initializing object", function(){
      var object = null;
      var initialized_object = null;
      var spy = null;

      beforeEach(function(){
        spy = jasmine.createSpy("spy");
        mangra.list = {};
        object = {
          foo: "bar"
        };
        initialized_object = mangra.init(object);
      });

      it("should initialize object with events bus", function(){
        expect(initialized_object).toBe(object);
        expect(object.on).toBeDefined();
        expect(object.off).toBeDefined();
        expect(object.once).toBeDefined();
        expect(object.fire).toBeDefined();
      });

      it("should bind handlers to events", function(){
        object.on("event", spy);

        object.fire("event", {});
        object.fire("event", {});

        jasmine.Clock.tick(1000);

        expect(spy).toHaveBeenCalled();
        expect(spy.calls.length).toBe(2);
      });

      it("should unbind previously binded handlers to events", function(){
        object.on("event", spy);
        object.off("event", spy);

        object.fire("event", {});
        jasmine.Clock.tick(1000);

        expect(spy).not.toHaveBeenCalled();
      });

      it("should call handler only once", function(){
        object.once("event", spy);

        object.fire("event", {});
        object.fire("event", {});
        object.fire("event", {});
        object.fire("event", {});

        jasmine.Clock.tick(1000);

        expect(spy.calls.length).toBe(1);
      });
    });

    describe('sprouting new scape', function(){
      it("it should sprout new scape from existing and save ref to it", function(){
        var sprouted = mangra.sprout('new_scape');

        expect(sprouted.prototype).toBe(mangra.prototype);
        expect(sprouted).toBe(mangra.new_scape);
      });

      it("it should sprout new scape from existing without saving ref to it, when name not specified", function(){
        var sprouted = mangra.sprout();

        expect(sprouted.prototype).toBe(mangra.prototype);
        expect(sprouted).not.toBe(mangra[sprouted.name]);
      });

      it("shouldn't rewrite any existing fields", function(){
        var on_method = mangra.on;
        var off_method = mangra.off;
        mangra_fields = {};
        for(field_name in mangra){
          if(mangra.hasOwnProperty(field_name)){
            mangra_fields[field_name] = mangra[field_name];
            mangra.sprout(field_name);
          }
        }

        for(field_name in mangra_fields){
          if(mangra_fields.hasOwnProperty(field_name)){
            expect(mangra_fields[field_name]).toBe(mangra[field_name]);
          }
        }
      });
    });
    
    describe('bind/unbind handlers', function(){
      var spy = null;

      beforeEach(function(){
        spy = jasmine.createSpy("spy");
        mangra.list = {};
        jasmine.Clock.useMock();
      });

      it('should bind handler to event', function(){
        mangra.on('event', spy);
        expect(spy).not.toHaveBeenCalled();

        mangra.fire('event');
        mangra.fire('event');
        mangra.fire('event');
        mangra.fire('event');
        jasmine.Clock.tick(1000);

        expect(spy).toHaveBeenCalled();
        expect(spy.calls.length).toBe(4);
      });

      it('".on" method should return function that unbinds handler', function(){
        var unbind = mangra.on('event', spy);

        unbind();

        mangra.fire('event');
        mangra.fire('event');
        mangra.fire('event');
        mangra.fire('event');

        jasmine.Clock.tick(1000);

        expect(spy).not.toHaveBeenCalled();
        expect(spy.calls.length).toBe(0);
      });

      it('should bind handler to several events', function(){
        mangra.on('event, another_event', spy);

        expect(spy).not.toHaveBeenCalled();

        mangra.fire('event');
        mangra.fire('another_event');
        mangra.fire('event');
        mangra.fire('another_event');

        jasmine.Clock.tick(1000);

        expect(spy).toHaveBeenCalled();
        expect(spy.calls.length).toBe(4);
      });

      it('should bind handler to several events, but unbind from only one', function(){
        mangra.on('event, another_event', spy);

        mangra.off('another_event', spy);

        expect(spy).not.toHaveBeenCalled();

        mangra.fire('event');
        mangra.fire('another_event');
        mangra.fire('event');
        mangra.fire('another_event');

        jasmine.Clock.tick(1000);

        expect(spy).toHaveBeenCalled();
        expect(spy.calls.length).toBe(2);
      });

      it('".on" method should return function that unbinds handler from every event', function(){
        var unbind = mangra.on('event, another_event', spy);

        unbind();

        mangra.fire('event');
        mangra.fire('another_event');
        mangra.fire('event');
        mangra.fire('another_event');

        jasmine.Clock.tick(1000);

        expect(spy).not.toHaveBeenCalled();
        expect(spy.calls.length).toBe(0);
      });


      it('should bind handler only once', function(){
        mangra.once('event', spy);
        expect(spy).not.toHaveBeenCalled();

        mangra.fire('event');
        mangra.fire('event');
        mangra.fire('event');
        mangra.fire('event');
        jasmine.Clock.tick(1000);

        expect(spy).toHaveBeenCalled();
        expect(spy.calls.length).toBe(1);
      });

      it('should unbind handler that was binded to be called only once', function(){
        mangra.once('event', spy);
        mangra.off('event', spy);
        expect(spy).not.toHaveBeenCalled();

        mangra.fire('event');
        mangra.fire('event');
        mangra.fire('event');
        mangra.fire('event');
        jasmine.Clock.tick(1000);

        expect(spy).not.toHaveBeenCalled();
        expect(spy.calls.length).toBe(0);
      });

      it('".once" method should return method, that unbinds handler', function(){
        var unbind = mangra.once('event', spy);
        unbind();
        expect(spy).not.toHaveBeenCalled();

        mangra.fire('event');
        mangra.fire('event');
        mangra.fire('event');
        mangra.fire('event');
        jasmine.Clock.tick(1000);

        expect(spy).not.toHaveBeenCalled();
        expect(spy.calls.length).toBe(0);
      });

      it('should bind once handler to several events', function(){
        mangra.on('event, another_event', spy);

        expect(spy).not.toHaveBeenCalled();

        mangra.fire('event');
        mangra.fire('another_event');

        jasmine.Clock.tick(1000);

        expect(spy).toHaveBeenCalled();
        expect(spy.calls.length).toBe(2);
      });

      it('should bind once handler to several events, but unbind from only one', function(){
        mangra.once('event, another_event', spy);

        mangra.off('another_event', spy);

        expect(spy).not.toHaveBeenCalled();

        mangra.fire('another_event');

        jasmine.Clock.tick(1000);

        expect(spy).not.toHaveBeenCalled();
        expect(spy.calls.length).toBe(0);
      });
    });

    describe('waiting for set of events', function(){
      var spy = null;

      beforeEach(function(){
        spy = jasmine.createSpy("spy");
        mangra.list = {};
        jasmine.Clock.useMock();
      });

      it("should call handler after bunch of events are fired", function(){
        mangra.wait("one, two, three, four", spy)

        mangra.fire("one");
        mangra.fire("two");
        mangra.fire("three");
        mangra.fire("four");

        jasmine.Clock.tick(1000);


        expect(spy.calls.length).toBe(1);
      });

      it("should call handler after only when needed bunch of events are fired", function(){
        mangra.wait("one, two, three, four", spy)

        mangra.fire("one");
        mangra.fire("one");
        mangra.fire("one");
        mangra.fire("two");
        mangra.fire("three");
        mangra.fire("three");
        mangra.fire("four");

        jasmine.Clock.tick(1000);

        expect(spy.calls.length).toBe(1);
      });

      it("should send data from every event to handler", function(){
        mangra.wait("one, two, three, four", spy);

        mangra.fire("one",  { fo: "bar"});
        mangra.fire("two",  { foo: "barr"});
        mangra.fire("three",{ fooo: "barrr"});
        mangra.fire("four", { foooo: "barrrr"});

        jasmine.Clock.tick(1000);

        expect(spy.calls.length).toBe(1);
        expect(spy.mostRecentCall.args[0].one[0]).toEqual({ fo: "bar"});
        expect(spy.mostRecentCall.args[0].two[0]).toEqual({ foo: "barr"});
        expect(spy.mostRecentCall.args[0].three[0]).toEqual({ fooo: "barrr"});
        expect(spy.mostRecentCall.args[0].four[0]).toEqual({ foooo: "barrrr"});
      });

      it("should unbind handler from waiting", function(){
        var unwait = mangra.wait("one, two, three, four", spy);

        unwait();

        mangra.fire("one",  { fo: "bar"});
        mangra.fire("two",  { foo: "barr"});
        mangra.fire("three",{ fooo: "barrr"});
        mangra.fire("four", { foooo: "barrrr"});

        jasmine.Clock.tick(1000);

        expect(spy.calls.length).toBe(0);
      });
    });


    describe('firing events', function(){
      var spy = null;

      beforeEach(function(){
        spy = jasmine.createSpy("spy");
        mangra.list = {};
        jasmine.Clock.useMock();
      });

      it("should fire events", function(){
        mangra.on("one", spy)
        mangra.on("two", spy)
        mangra.on("three", spy)
        mangra.on("four", spy)

        mangra.fire("one")
        mangra.fire("two")
        mangra.fire("three")
        mangra.fire("four")

        jasmine.Clock.tick(1000);

        expect(spy.calls.length).toBe(4);
      });

      it("should provide data to handler", function(){
        mangra.on("one", spy);
        var data = {};
        mangra.fire("one", data);
        expect(spy.mostRecentCall.args[0]).toBe(data);
      });

      it("should provide undefined to handler when data is not specified", function(){
        mangra.on("one", spy);
        var data = {};
        mangra.fire("one");
        jasmine.Clock.tick(1000);
        expect(spy.mostRecentCall.args[0]).not.toBeDefined();
      });

      it("should provide different data every time", function(){
        mangra.on("one", spy);
        mangra.on("two", spy);
        mangra.on("three", spy);

        var data_one = {};
        var data_two = {};
        var data_three = {};

        mangra.fire("one", data_one);
        mangra.fire("two", data_two);
        mangra.fire("three", data_three);

        jasmine.Clock.tick(1000);

        expect(spy.calls[0].args[0]).toBe(data_one);
        expect(spy.calls[1].args[0]).toBe(data_two);
        expect(spy.calls[2].args[0]).toBe(data_three);
      });

    });
  });
  
});