import { kplugin_value_evaluator_init } from './init.js';

(function(k, factory) {
  'use strict';

  factory(new Kluginn.default());

})(kintone, function(p){

  var K = p;
  var $ = K.$;

  var config = K.config.fetch();

  K.init().then(function () {
    kplugin_value_evaluator_init(K, $, config);
  });

});
