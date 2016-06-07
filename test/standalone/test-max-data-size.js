/*1* KEEP THIS CODE AT THE TOP TO AVOID LINE NUMBER CHANGES */
/*2*/'use strict';
/*3*/function foo(n) {
/*4*/  var A = new Array(3); return n+42+A[0];
/*5*/}
/**
 * Copyright 2015 Google Inc. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

process.env.GCLOUD_DIAGNOSTICS_CONFIG = 'test/fixtures/test-config.js';

var assert = require('assert');
var logModule = require('@google/cloud-diagnostics-common').logger;
var v8debugapi = require('../../lib/v8debugapi.js');
var scanner = require('../../lib/scanner.js');
var config = require('../../config.js').debug;
var api;

var breakpointInFoo = {
  id: 'fake-id-123',
  location: { path: 'test-max-data-size.js', line: 4 }
};

describe('maxDataSize', function() {
  before(function(done) {
    if (!api) {
      var logger = logModule.create(config.logLevel);
      scanner.scan(true, config.workingDirectory, function(err, fileStats, hash) {
        assert(!err);
        api = v8debugapi.create(logger, config, fileStats);
        done();
      });
    } else {
      done();
    }
  });

  it('should limit data reported', function(done) {
    config.capture.maxDataSize = 5;
    // clone a clean breakpointInFoo
    var bp  = {id: breakpointInFoo.id, location: breakpointInFoo.location};
    api.set(bp, function(err) {
      assert.ifError(err);
      api.wait(bp, function(err) {
        assert.ifError(err);
        assert(bp.variableTable.some(function(v) {
          return v.status.description.format === 'Max data size reached';
        }));
        api.clear(bp);
        done();
      });
      process.nextTick(function() {foo(2);});
    });
  });

  it('should be unlimited if 0', function(done) {
    config.capture.maxDataSize = 0;
    // clone a clean breakpointInFoo
    var bp  = {id: breakpointInFoo.id, location: breakpointInFoo.location};
    api.set(bp, function(err) {
      assert.ifError(err);
      api.wait(bp, function(err) {
        assert.ifError(err);
        assert(bp.variableTable.reduce(function(acc, elem) {
          return acc && elem.status.description.format !== 'Max data size reached';
        }), true);
        api.clear(bp);
        done();
      });
      process.nextTick(function() {foo(2);});
    });
  });
});