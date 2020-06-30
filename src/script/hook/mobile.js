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

   kplugin_value_evaluator_init(K, $, config, ready);

});