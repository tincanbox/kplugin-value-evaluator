(function(k, factory) {
  'use strict';

  factory(new Kluginn.default());

})(kintone, function(p){

  var K = p;
  var $ = K.$;

  // "C"onfig
  var C = {
    column: [ //Define Table Columns
      {
        title:"Name", field:"name",
        width:150, editor: 'input',
        validator: ["required"]
      },
      {
        title:"Target", field:"target",
        width:150, editor: 'select',
        editorParams: function(row){
          var vals = {};
          var ks = Object.keys(S.properties).sort();
          for(var k of ks){
            var p = S.properties[k];
            vals[p.code] = p.label + " ["+p.type+"]"
          }
          return vals;
        },
        validator: ["required"]
      },
      {
        title:"Timing", field:"timing",
        width:150, editor: 'select',
        editorParams: ["create", "edit", "all"],
        validator: ["required"]
      },
      {
        title:"Value",
        field:"value", formatter: 'textarea', editor: 'textarea',
        validator: ["required"]
      },
      {
        formatter: function(cell, formatterParams, onRendered){
          return '<i class="fa fa-trash-alt"></i>';
        },
        width:40, align:"center",
        cellClick: function(e, cell){
          K.dialog({
            type: 'warning',
            text: 'Deleting Config Row',
            showConfirmButton: true,
            showCancelButton: true
          }).then(function(e){
            if(e.value){
              cell.getRow().delete();
            }
          });
        }
      }

    ]
  };

  // "S"torage
  var S = {
    config: {}
  };

  // "A"ction
  var A = {
    'click': {
      // Help popup
      'show-help': function(){
        K.dialog({
          title: 'Help',
          html: K.ui.render('help')()
        });
      },
      // default table action
      'config-table-add-row': function(e){
        S.table.addRow();
      },
      // default table action
      'config-table-save': function(){
        var c = K.config.retrieve_form_data();
        console.log("cb", c);
        c.json = c.json || {};
        c.json.table = S.table.getData();
        c.json.table = c.json.table.filter(function(r){
          var any = false;
          for(var k in r){
            if(r[k]){
              any = true;
              break;
            }
          }
          return any;
        });
        validate(c)
          .then(function(){
            console.log(c);
            K.config.save(c).then(function(){
              K.dialog({
                title: "Yay!!",
                text: "Your data was correctly saved."
              });
              init_config_table();
            });
          })
          .catch(validation_error);
      },
      'config-table-download': function(){
        S.table.download("csv", "kplugin-config-data.csv");
      },
      'config-table-upload': function(){
        K.file.select()
          .then(function(r){
            return K.file.read(r.input.files[0], 'text');
          })
          .then(function(r){
            return K.csv.parse(r.file.result, {
              header: true
            });
          })
          .then(function(r){
            S.table.setData([]);
            S.table.setData(r.data);
          });
      }
    }
  };


  /* Procedures below.
   */


  Promise.all([
    K.api.fetch('app/form/fields')
  ]).then(function(e){
    console.log(e);
    S.properties = e[0].properties;
    K.init().then(main);
  });

  // Main hook after kintone and Kluginn were initialized.
  function main(){
    init_config_table();
    K.ui.bind_action(A);
  }

  function validate(data){
    return new Promise(function(res, rej){
      res(data);
    });
  }

  function validation_error(r){
    throw new Error("validation failed");
  }

  function init_config_table(){
    load_config();
    build_table();
  }

  function load_config(){
    S.config = K.config.fetch();
  }

  function build_table(){
    S.table = new Tabulator("#config-table", {
      data: S.config.json.table || [],
      columns: C.column.map(function(e){
        e.downloadTitle = e.field;
        return e;
      }),
      //fit columns to width of table
      layout: "fitColumns",
      //hide columns that dont fit on the table
      responsiveLayout: "hide",
      //show tool tips on cells
      tooltips: true,
      //when adding a new row, add it to the top of the table
      addRowPos: "top",
      //allow undo and redo actions on the table
      history: true,
      //paginate the data
      pagination: "local",
      //allow 7 rows per page of data
      paginationSize: 10,
      //allow column order to be changed
      movableColumns: true,
      //allow row order to be changed
      resizableRows: true,
      /* set height of table (in CSS or here),
       * this enables the Virtual DOM and
       * improves render speed dramatically (can be any valid css height value)
       */
      height: 360
    });
  }

  function init(){
    render_variable_description();
  }

  function render_variable_description(){
    var div = $('#section-variable-description');
    var tbl = div.find('table');
    var tr = $('<tr>');
    tr.append($('<td>record</td>'));
    tr.append($('<td></td>'));
    var cont = $('<td>');
    var stbl = $('<table>');
    var html = "";

    for(var k in S.props){
      var row = S.props[k];
      var str = $('<tr>');
      var tdk = $('<td>');
      var tdl = $('<td>');
      var tdt = $('<td>');
      tdk.html(k);
      tdl.html(row.label);
      tdt.html(row.type);
      str.append(tdk);
      str.append(tdl);
      str.append(tdt);
      stbl.append(str);
    }
    cont.append(stbl);
    tr.append(cont);
    tbl.find('tbody').append(tr);
  }

  function recognize_field(){
    var $opt = $('option:selected').get();
    console.log("fields", $opt)
    DATA.contents = {
      field_code : $opt[0].code,
      attribute : $opt[0].attr
    }
    DATA.contents = JSON.stringify(DATA.contents)
  }

  function recognize_textbox(){
    var $temp = $(".template").val();
    DATA.template = JSON.stringify($temp);
  }

  var bind_event = function(){
    $("#save").on('click', function(e) {
      e.preventDefault();
      var $opt = $('option:selected').get();
      if($opt[0].id == "choice_null"){
        error_invalid_choice();
        return false;
      }
      recognize_field();
      recognize_textbox();
      if(!DATA)return;

      try{
        kintone.plugin.app.setConfig(DATA, on_save);
      }catch(er){
        error_exception(er);
      }
    });
  }

  function error_invalid_choice(){
    K.dialog({
      type: 'error',
      title: 'Error',
      text: '対象のフィールドを選択してください。'
    });
  }

  function error_exception(e){
    K.dialog({
      type: 'error',
      title: 'Error',
      text: er.message
    });
  }

  function on_save(){
    K.dialog({
      type: "success",
      title: "",
      text: "Saved!"
    });
  }
});
