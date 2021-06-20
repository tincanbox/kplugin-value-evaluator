export function kplugin_value_evaluator_init(K, $, config){
  K.$k.events.on('app.record.create.show', function(e){
    event_disable_target_field(e);
    event_block_new_entry(e);
    return e;
  });

  K.$k.events.on('app.record.index.edit.show', function(e){
    event_disable_target_field(e);
    return e;
  });

  K.$k.events.on('app.record.edit.show', function(e){
    event_disable_target_field(e);
    return e;
  });


  K.$k.events.on('app.record.create.submit', function(e){
    return event_on_save(e, 'create');
  });

  K.$k.events.on('app.record.edit.submit', function(e){
    return event_on_save(e, 'edit');
  });

  K.api.fetch('app/form/fields')
    .then(function(p){
      for(var k in p.properties){
        K.$k.events.on([
          'app.record.create.change.' + k,
          'app.record.edit.change.' + k,
          'app.record.index.change.' + k,
        ], function(e){
          e = update_all_field(e, 'change');
          return e;
        });
      }
    });

  function event_block_new_entry(e){
    each_config_target(function(a){
      if(e.record[a.target]){
        e.record[a.target].value = e.record[a.target].value || "AUTOCALC";
      }else{
        console.log("not found", a.target);
      }
    });
  }

  function event_disable_target_field(e){
    each_config_target(function(a){
      if(e.record[a.target]){
        e.record[a.target].disabled = true;
      }else{
        console.log("not found", a.target);
      }
    });
  }

  function event_on_save(e, timing){
    return new kintone.Promise(function(res, rej){
      retrieve_field_meta().then(function(){
        e = update_all_field(e, timing);
        res(e);
      });
    });
  }

  function update_all_field(e, timing){
    var rec = e.record;
    var r = rec;
    each_config_target(function(a){
      if(a.timing == 'all' || a.timing == timing){
        var t = r[a.target];
        if(!t){
          return e;
        }
        var param = FM.ob.merge({}, a.param);
        param.record = r;
        param.generate = _helper_generate;
        try{
          t.value = _.template(a.value)(param).trim();
        }catch(exc){
          var msg = "自動計算に失敗しました: " + exc.message;
          K.dialog({
            title: "Error",
            text: msg
          });
          t.error = msg;
        }
      }
    });

    return e;
  }


  /* MAIN
   */

  function main(){
    return Promise.all([
      retrieve_field_meta()
    ]).then(function(){
    });
  }

  function retrieve_field_meta(){
    return new Promise(function(res, rej){
      var ps = [];
      each_config_target(function(a){
        var p = fetch_matched_record(a).then(function(param){
          a.param = param;
        }).catch(function(e){
          console.log("ERROR", e);
        });
        ps.push(p);
      });
      Promise.all(ps).then(function(r){
        res(r);
      });
    });
  }

  /* ( Nothing
   * ) -> Promise
   */
  function fetch_matched_record(a){
    let proc = new Promise((resolve, reject) =>{
      var opt = {
        last_increment: 0,
        total: 0
      };
      kintone.api(kintone.api.url('/k/v1/records', true), 'GET', {
        "app": kintone.app.getId(),
        "query": a.target + " != \"\" order by " + a.target + " desc",
        "fields": [a.target],
        "totalCount": true
      } , function(e) {
        var record = e.records[0];
        var li = (record && record[a.target]) ? record[a.target].value : "";
        var tt = e.totalCount ? parseInt(e.totalCount) : 0;
        opt.last_increment = li;
        opt.total = tt;
        resolve(opt);
      }, function(error) {
        reject("something wrong has happened!!");
      });

    });
    return proc;
  }

  function _helper_generate(value, o){
    var prefix = o.prefix || "";
    var suffix = o.suffix || "";
    var max    = o.max || 0;
    var padc   = o.padding || "0";
    var glue   = o.glue || "";
    var pchr   = padc.repeat(max);
    var pad_direction = o.pad_direction || 0;

    var v = value + "";

    v = v.replace(new RegExp("^" + prefix), "");
    v = v.replace(new RegExp(suffix + "$"), "");
    v = (pad_direction == 0)
      ? v.replace(new RegExp("^" + padc + "+"), "")
      : v.replace(new RegExp(padc + "+$"), "");

    if(max > v.length){
      v = (pad_direction == 0) ? (pchr + v).slice(-1 * max) : (v + pchr).slice(max);
    }

    return prefix + v + suffix;
  }

  function each_config_target(clb){
    for(var a of config.json.table || []){
      clb(a);
    }
  }

}
