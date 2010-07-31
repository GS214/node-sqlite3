require.paths.push(__dirname + '/..');

sys = require('sys');
fs = require('fs');
path = require('path');

TestSuite = require('async-testing/async_testing').TestSuite;
sqlite = require('sqlite3_bindings');

puts = sys.puts;
inspect = sys.inspect;

// createa table
// prepare a statement (with options) that inserts
// do a step
// check that the result has a lastInsertedId property

var suite = exports.suite = new TestSuite("node-sqlite last inserted id test");

function createTestTable(db, callback) {
  db.prepare('CREATE TABLE table1 (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT)',
    function (error, createStatement) {
      if (error) throw error;
      createStatement.step(function (error, row) {
        if (error) throw error;
        callback();
      });
    });
}

function fetchAll(db, sql, callback) {
  db.prepare(
    sql,
    function (error, statement) {
      if (error) throw error;
      var rows = [];
      function doStep() {
        statement.step(function (error, row) {
          if (error) throw error;
          if (row) {
            rows.push(row);
            doStep();
          }
          else {
            callback(rows);
          }
        });
      }
      doStep();
    });
}

var tests = [
  { 'insert a row with lastinsertedid':
    function (assert, finished) {
      var self = this;

      self.db.open(':memory:', function (error) {
        function createStatement(error, statement) {
          if (error) throw error;
          statement.step(function (error, row) {
            puts("This is " + inspect(this));
            assert.equal(this.lastInsertRowID, 101, "Last inserted id should be 1");
            assert.equal(this.affectedRows, 1, "Last inserted id should be 1");
            statement.reset();

            statement.step(function (error, row) {
              puts("This is " + inspect(this));
              assert.equal(this.lastInsertRowID, 102, "Last inserted id should be 1");
              assert.equal(this.affectedRows, 1, "Last inserted id should be 1");

              finished();
            });
          });
        }

        createTestTable(self.db,
          function () {
            var insertSQL
                = 'INSERT INTO table1 (id, name) VALUES (100, "first post!")';

            self.db.prepareAndStep(insertSQL, function (error, row) {
              if (error) throw error;

              assert.ok(!row, "Row was trueish, but should be falseish");

              self.db.prepare('INSERT INTO table1 (name) VALUES ("orlando")'
                              , { affectedRows: true, lastInsertRowID: true }
                              , createStatement);
            });
          });
      });
    }
  }
];

// order matters in our tests
for (var i=0,il=tests.length; i < il; i++) {
  suite.addTests(tests[i]);
}

var currentTest = 0;
var testCount = tests.length;

suite.setup(function(finished, test) {
  this.db = new sqlite.Database();
  finished();
});
suite.teardown(function(finished) {
  if (this.db) this.db.close(function (error) {
                               finished();
                             });
  ++currentTest == testCount;
});

if (module == require.main) {
  suite.runTests();
}
