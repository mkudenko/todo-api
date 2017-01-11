"use strict";
var express = require('express');
var bodyParser = require('body-parser');
var _ = require('lodash');
var db = require('./db');

var app = express();
var PORT = process.env.PORT || 3000;
var todos = [];

app.use(bodyParser.json());

app.get('/', function (req, res) {
    res.send('Todo API root');
});

app.get('/todos', function (req, res) {
    var queryParams = req.query;
    var filteredTodos = todos;

    if (queryParams.hasOwnProperty('completed') && queryParams.completed === 'true') {
        filteredTodos = _.filter(filteredTodos, {completed: true});
    } else if (queryParams.hasOwnProperty('completed') && queryParams.completed === 'false') {
        filteredTodos = _.filter(filteredTodos, {completed: false});
    }

    if (queryParams.hasOwnProperty('q') && queryParams.q.length > 1) {
        filteredTodos = _.filter(filteredTodos, function (todo) {
            return todo.description.toLowerCase().indexOf(queryParams.q.toLowerCase()) > -1;
        });
    }

    res.json(filteredTodos);
});

app.get('/todos/:id', function (req, res) {
    var todoId = parseInt(req.params.id, 10);
    var matchedTodo = _.find(todos, {id: todoId});
    if (typeof matchedTodo === 'undefined') {
        return res.status(404).send();
    } else {
        res.json(matchedTodo);
    }
});

app.post('/todos', function (req, res) {
    var body = _.pick(req.body, ['description', 'completed']);

    if (!_.isBoolean(body.completed) || !_.isString(body.description) || body.description.trim().length === 0) {
        return res.status(400).send();
    }
    body.description = body.description.trim();
    db.todo.create(body).then(function (todo) {
        res.json(todo.toJSON());
    }, function (e) {
        res.status(400).json(e);
    });
});

app.delete('/todos/:id', function (req, res) {
    var todoId = parseInt(req.params.id, 10);
    var matchedTodo = _.find(todos, {id: todoId});
    if (!matchedTodo) {
        return res.status(404).json({"error": "no todo found with that id"});
    } else {
        todos = _.without(todos, matchedTodo);
        res.json(matchedTodo);
    }
});

app.put('/todos/:id', function (req, res) {
    var todoId = parseInt(req.params.id, 10);
    var matchedTodo = _.find(todos, {id: todoId});
    var body = _.pick(req.body, ['description', 'completed']);
    var validAttributes = {};

    if (!matchedTodo) {
        return res.status(404).json({"error": "no todo found with that id"});
    }

    if (body.hasOwnProperty('completed') && _.isBoolean(body.completed)) {
        validAttributes.completed = body.completed;
    } else if (body.hasOwnProperty('completed')) {
        return res.status(400).send();
    }
    if (body.hasOwnProperty('description') && _.isString(body.description) && body.description.trim().length > 0) {
        validAttributes.description = body.description.trim();
    } else if (body.hasOwnProperty('description')) {
        return res.status(400).send();
    }

    _.assign(matchedTodo, validAttributes);

    res.json(matchedTodo);
});

db.sequelize.sync().then(function () {
    app.listen(PORT, function () {
        console.log('Express listening on port ' + PORT + '!');
    });
});

