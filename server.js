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
    var query = req.query;
    var where = {};

    if (query.hasOwnProperty('completed') && query.completed === 'true') {
        where.completed = true;
    } else if (query.hasOwnProperty('completed') && query.completed === 'false') {
        where.completed = false;
    }

    if (query.hasOwnProperty('q') && query.q.length > 1) {
        where.description = {
            $like: '%' + query.q +'%'
        };
    }

    db.todo.findAll({where: where}).then(function (todos) {
        res.json(todos);
    }, function (e) {
        res.status(500).send();
    });
});

app.get('/todos/:id', function (req, res) {
    var todoId = parseInt(req.params.id, 10);
    db.todo.findById(todoId).then(function (todo) {
        if (todo) {
            res.json(todo.toJSON());
        } else {
            res.status(404).json({error: 'todo not found.'});
        }
    }, function (e) {
        res.status(500).send();
    });
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
    db.todo.destroy({
        where: {
            id: todoId
        }
    }).then(function (rowsDeleted) {
        if (rowsDeleted === 0) {
            res.status(404).json({
                error: 'No todo with id'
            });
        } else {
            res.status(204).send();
        }
    }, function (e) {
        res.status(500).send();
    });
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

