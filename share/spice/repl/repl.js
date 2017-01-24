(function (env) {
    "use strict";

    Spice.registerHelper('is_selected', function(option, value){
        if (option === value) {
            return ' selected';
        } else {
            return '';
        }
    });

    // Use array to ensure order for <select>
    var selectLangs = [
        { val: "c", text: "C" },
        { val: "cpp", text: "C++" },
        { val: "cpp11", text: "C++11" },
        { val: "csharp", text: "C#" },
        { val: "fsharp", text: "F#" },
        { val: "go", text: "Go" },
        { val: "java", text: "Java" },
        { val: "lua", text: "Lua" },
        { val: "nodejs", text: "JavaScript (Node.js)" },
        { val: "php", text: "PHP" },
        { val: "python", text: "Python" },
        { val: "python3", text: "Python 3" },
        { val: "ruby", text: "Ruby" },
        { val: "rust", text: "Rust" },
        { val: "swift", text: "Swift" }

        // Coming Soon
        // { val: "apl", text: "Apl" },
        // { val: "babel", text: "Babel" },
        // { val: "bloop", text: "Bloop" },
        // { val: "brainf", text: "Brainf" },
        // { val: "coffeescript", text: "CoffeeScript" },
        // { val: "emoticon", text: "Emoticon" },
        // { val: "forth", text: "Forth" },
        // { val: "javascript", text: "JavaScript" },
        // { val: "jest", text: "Jest" },
        // { val: "lolcode", text: "LOLCODE" },
        // { val: "python_turtle", text: "Python (Turtle)" },
        // { val: "qbasic", text: "Qbasic" },
        // { val: "roy", text: "Roy" },
        // { val: "scheme", text: "Scheme" },
        // { val: "unlambda", text: "Unlambda" },
        // { val: "web_project", text: "HTML, CSS" }
    ];

    // build map of "Select" text to API
    var langs = {};
    $.each(selectLangs, function(index, obj){
        langs[obj.text] = obj.val;
    });

    var langAliases = {
        'c plus plus': 'cpp',
        'c sharp': 'csharp',
        'c#': 'csharp',
        'c++': 'cpp',
        'c++11': 'cpp11',
        'cplusplus': 'cpp',
        'f sharp': 'fsharp',
        'f#': 'fsharp',
        'go lang': 'go',
        'golang': 'go',
        'java script': 'nodejs',
        'js es6': 'babel',
        'js': 'nodejs',
        'node.js': 'nodejs',
        'node': 'nodejs',
        'python 2': 'python',
        'python 3': 'python3',
        'python2': 'python',
    };

    // Remap languages to appropriate editing mode name
    // use "text" mode for unsupported languages
    var modes = {
        c: "c_cpp",
        cpp: "c_cpp",
        cpp11: "c_cpp",
        fsharp: "text",
        go: "golang",
        nodejs: "javascript",
        python3: "python"

        // Coming Soon
        // apl: "text",
        // bloop: "text",
        // brainf: "text",
        // coffeescript: "coffee",
        // emoticon: "text",
        // jest: "text",
        // lolcode: "text",
        // python_turtle: "python",
        // qbasic: "text",
        // roy: "text",
        // unlambda: "text"
    };

    var syntaxLangs = {
        c: "C",
        cpp: "C++",
        csharp: "C#",
        go: "Go",
        java: "Java",
        javascript: "JavaScript",
        python: "Python",
        ruby: "Ruby",
        swift: "Swift",
    };

    var syntaxAliases = {
        nodejs: "javascript",
    };

    // Store generated HTML here for language code samples
    var sampleCodeCache = {};

    function getMode(lang) {
        return modes[lang] || lang;
    }

    function getSampleLang(lang) {
        return syntaxAliases[lang] || lang;
    }

    var editorOptions = {
        showPrintMargin: false,
        showInvisibles: true,
    };

    var hasShown = false,
        editor_id = "repl__editor",
        endpoint  = "/js/spice/repl_eval/";

    env.ddg_spice_repl = function() {

        // Prevent jQuery from appending "_={timestamp}" in our url when we use $.getJSON
        $.ajaxSetup({ cache: true });

        var query = DDG.get_query(),
            codeLang = query.replace(/repl|interpreter|online/g, "").toLowerCase().trim();

        codeLang = langAliases[codeLang] || codeLang;
        var hasSamples = syntaxLangs[codeLang] !== undefined || syntaxAliases[codeLang] !== undefined;

        DDG.require("/js/ace/ace.js", function() {
            Spice.add({
                id: 'repl',
                name: 'REPL',
                data: {
                    langs: selectLangs,
                    selected: codeLang,
                    hasSamples: hasSamples,
                    samples: undefined
                },
                meta: {
                    sourceName: 'repl.it',
                    sourceUrl: 'https://repl.it/languages/' + codeLang
                },
                onShow: function () {

                    // Ensure this only runs once
                    if (hasShown) {
                        return;
                    } else {
                        hasShown = true;
                    }

                    // Ace editor setup
                    ace.config.set("basePath", "/js/ace/");
                    var editor = ace.edit(editor_id);
                    var mode = getMode(codeLang);
                    editor.setOptions(editorOptions);
                    editor.getSession().setMode("ace/mode/" + mode);

                    // Check for DDG dark theme
                    var theme = (DDG.settings.get('kae') === 'd') ? "tomorrow_night" : "tomorrow";
                    editor.setTheme("ace/theme/" + theme);

                    // Cache jQuery selectors
                    var $result = $("#repl__result"),
                        $submit = $("#repl__submit"),
                        $select = $("#repl__language"),
                        $samplesContainer = $("#repl__samples__container"),
                        $samples = $("#repl__samples"),
                        $editor = $("#" + editor_id);

                    // Call SyntaxDB API to get sample code snippets
                    // -> then pass response to Handlebars template
                    // -> then store HTML output in local cache
                    function getSamples(sampleLang) {
                        var cachedHTML = sampleCodeCache[sampleLang] || null;
                        if (cachedHTML) {
                            $samples.html(cachedHTML);
                        } else {
                            return $.getJSON('/js/spice/repl_samples/' + sampleLang, function(json) {
                                var html = DDH.repl.samples_select(json);
                                $samples.html(DDH.repl.samples_select(json));
                                sampleCodeCache[sampleLang] = html;
                            });
                        }
                    }

                    // Create Samples Dropdown
                    if (hasSamples) {
                        var sampleLang = getSampleLang(codeLang);
                        $.when( getSamples(sampleLang) ).then(function(){
                            $samples.change(function() {
                                var code = $samples.find("option:selected").data('text') || null;
                                if (code) {
                                    editor.setValue(code);
                                }
                            });
                            $samplesContainer.removeClass('hide');
                        });
                    }

                    // "Execute" button handler
                    $submit.click(function(){
                        $result.val("Executing code...");
                        var code = editor.getValue();
                        code = encodeURIComponent(code);
                        var url = [endpoint, codeLang, code].join("/");
                        $.getJSON( url , function(res){
                            var output = '',
                                hasError = false;
                            if (!res) {
                                return false;
                            }
                            if (res && res.length > 0) {
                                // Iterate over array of data
                                $.each(res, function(key, obj){

                                    // If any errors, return error message as output
                                    if (obj.command === "result" && obj.error !== '') {
                                        output = obj.error;
                                        hasError = true;
                                        return false;

                                    // If no output, but we have a result, print result
                                    } else if (obj.command === "result" && output.length === 0) {
                                        output = obj.data;
                                        return false;

                                    // Join output string as we iterate over them
                                    } else if (obj.command === "output") {
                                        output = output + obj.data;
                                    }
                                });
                            } else {
                                hasError = true;
                                output = "Error: Unable to evaluate result";
                            }
                            $result.val(output);

                            // Set text color red when in error state
                            if (hasError) {
                                $result.addClass('tx-clr--red');
                            } else {
                                $result.removeClass('tx-clr--red');
                            }
                        });
                    });

                    // Select element handler
                    $select.change(function(){
                        $samplesContainer.addClass('hide');
                        var selectText = $select.find("option:selected").text();
                        codeLang = langs[selectText];
                        var mode = getMode(codeLang);
                        var sampleLang = getSampleLang(codeLang);
                        editor.getSession().setMode("ace/mode/" + mode);
                        $.when( getSamples(sampleLang) ).then(function(){
                            $samplesContainer.removeClass('hide');
                        });
                    });

                    // Stop DDG keybindings, when editor has focus
                    $editor.keydown(function(e) {
                        e.stopPropagation();
                    });
                },
                templates: {
                    group: 'base',
                    options: {
                        content: Spice.repl.content,
                        moreAt: true
                    }
                }
            });
        });
    };
}(this));

// Call self
ddg_spice_repl();
