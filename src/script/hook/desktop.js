(function(k, factory) {
  'use strict';

  factory(new Kluginn.default());

})(kintone, function(p){

  var K = p;
  var $ = K.$;

  var config = K.config.fetch();

  var ready = K.init().then(main);

  /* Entry points.
   */

  K.$k.events.on('app.record.create.show', function(e){
    event_disable_target_field(e);
    event_block_new_entry(e);
    return e;
  });

  K.$k.events.on('app.record.index.edit.show', function(e){
    event_disable_target_field(e);
    return e;
  });

  K.$k.events.on('app.record.create.submit', function(e){
    return event_on_save(e, 'create');
  });

  K.$k.events.on('app.record.edit.submit', function(e){
    return event_on_save(e, 'edit');
  });

  K.$k.events.on('app.record.edit.show', function(e){
    event_disable_target_field(e);
    return e;
  });

  function event_block_new_entry(e){
    each_config_target(function(a){
      e.record[a.target].value = "AUTOCALC";
    });
  }

  function event_disable_target_field(e){
    each_config_target(function(a){
      e.record[a.target].disabled = true;
    });
  }

  function event_on_save(e, timing){
    return new kintone.Promise(function(res, rej){
      retrieve_field_meta().then(function(){
        update_all_field(e, timing);
        res(e);
      });
    });
  }

  function update_all_field(e, timing){
    each_config_target(function(a){
      if(a.timing == 'all' || a.timing == timing){
        var record = e.record;
        var param = FM.ob.merge({}, a.param);
        param.record = record;
        param.generate = _helper_generate;
        e.record[a.target].value = _.template(a.value)(param).trim();
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
      kintone.api(kintone.api.url('/k/v1/records', true), 'GET', {
        "app": kintone.app.getId(),
        "query": a.target + " != \"\" order by " + a.target + " desc",
        "fields": [a.target],
        "totalCount": true
      } , function(e) {
        var record = e.records[0];
        var li = (record && record[a.target]) ? record[a.target].value : "";
        var tt = e.totalCount ? parseInt(e.totalCount) : 0;
        var opt = {
          last_increment: li,
          total: tt
        };
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

});
