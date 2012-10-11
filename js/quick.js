define('js/quick', [
    'jquery',
    'underscore',
    'async',
    'handlebars',
    'couchr',
    'bird-down',
    'js/reference',
    'EpicEditor',
    'moment',
    'jquery-lifestream',
    'hbt!templates/quick',
    'hbt!templates/quick_tag',
    'hbt!templates/quick_people',
    'hbt!templates/quick_people_row',
    'hbt!templates/quick_journal',
    'hbt!templates/quick_lifestream'
], function ($, _, async, handlebars, couchr, birddown, reference, EpicEditor, moment, lifestream, base_t, tag_t, people_t, people_row_t, journal_t, lifestream_t) {

    var exports = {};
    var selector = '.main'
    var options;

    exports.init = function (opts) {
        options = opts;
        selector = opts.selector;
    }


    exports.tag = function () {
        showNav('tag');
        $(selector).find('.quick_form').html(tag_t());
    }


    function addPerson(name) {
        // split
        // get valid name
        var person = {
            name : name,
            handle : name
        }

        $(selector).find('.table.name').show();
        $(selector).find('.table.name tbody').append(people_row_t(person))

    }


    exports.people = function () {
        showNav('people');
        $(selector).find('.quick_form').html(people_t());
        var $person_entry = $(selector).find('input[name="person_entry"]');

        $(selector).find('form').on('submit', function(){
            addPerson($person_entry.val());
            return false;
        })


        var eventName = "onwebkitspeechchange" in $person_entry.get(0) ? "webkitspeechchange" : "speechchange";
        $person_entry.on(eventName, function(){
           addPerson($person_entry.val());
           $person_entry.val('');
        });
    }


   function cite($btn, editor) {
       var text = $btn.data('text');
       var index = $btn.data('index');

       // see http://epiceditor-demos.herokuapp.com/
       var doc = editor.editorIframeDocument;
       var selection = editor.editorIframeDocument.getSelection();
       //console.log(selection);
       if (selection.rangeCount === 0) {
           return;
       }
       var range = selection.getRangeAt(0);

       var noTextSelected = (range.endOffset === range.startOffset);

       var prefix = '[';
       var postfix = "][" + index + "]";

       if (noTextSelected) {
           prefix += text;
       }

       // add the prefix
       var range = selection.getRangeAt(0);
       range.insertNode(document.createTextNode(prefix));
       range.collapse(false);

       // And the postfix
       selection.removeAllRanges();
       selection.addRange(range);
       range.insertNode(document.createTextNode(postfix));
   }




    exports.journal = function () {
        showNav('journal');

        var date_str = moment().format('LL');
        $(selector).find('.quick_form').html(journal_t({date_str : date_str}));

        var bd = new birddown({
            doublebrackets : true,
            doublebracketsUrlBase : '#/topics/',
            hashtagUrlBase : "#/topics/",
            cashtagUrlBase : "https://twitter.com/#!/search?q=%24",
            usernameUrlBase : "#/person/",
            listUrlBase : "https://twitter.com/"
        });
        var parse = function(str){
            return bd.parse(str);
        }

        var editor = new EpicEditor({
            parser: parse,
            focusOnLoad : true
        }).load();

        var query = {
            startkey: moment().sod().valueOf(),
            endkey: moment().eod().valueOf(),
            include_docs: true
        }

        couchr.get('_ddoc/_view/timeline_items', query, function(err, resp){
            $(selector).find('.references').html(reference.createReferenceSheet(resp));
            $('button.cite').on('click',function(){
                cite($(this), editor);
            });
        })
    }

    exports.lifestream = function() {
        showNav('lifestream');
        $(selector).find('.quick_form').html(lifestream_t());
        var settings = {
            list:[
              {
                service: "github",
                user: "ryanramage"
              },
              {
                service: "twitter",
                user: "eckoit"
              }
            ]
        };
        async.parallel({
            lifestream : function(cb){
                $('#lifestream').lifestream(settings, cb);
            },
            previous : function(cb) {
                couchr.get('_ddoc/_view/service_by_date', {limit: 200}, function(err, resp){
                    var ids = {};
                    _.each(resp.rows, function(row){
                        var state = 'exists';
                        if (row.value === true) state = 'ignore';
                        ids[row.id] = state;
                    });
                    cb(null, ids);
                });
            }
        }, function(err, results){
            var docs = [];
            _.each(results.lifestream, function(item){
                item._id = item.config.service + '-' + item.date.getTime();
                if (results.previous[item._id]) return;
                item.type = 'lifestream.service';
                item.timestamp = item.date.getTime();
                delete item.config._settings;
                docs.push(item);
            });
            if (docs.length > 0){
                couchr.post('_db/_bulk_docs', {docs: docs}, function(err, resp){
                    console.log(err, resp);

                });
            }

        });
    }

    exports.routes = function() {
       return  {
            '/quick/tag' : exports.tag,
            '/quick/people' : exports.people,
            '/quick/journal' : exports.journal,
            '/quick/lifestream' : exports.lifestream,
            '/quick' : exports.tag
        }
    }



    function showNav(active) {
        options.emitter.emit('section', 'quick');
        $(selector).html(base_t());
        $(selector).find('.nav-tabs').removeClass('active');
        $(selector).find('.' + active).addClass('active');
    }


    return exports;
})