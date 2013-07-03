#!/bin/bash

curl -XPOST 'http://localhost:8889/yag' -d '
{
    "name": "Yaroslav",
    "surname": "Gaponov",
    "email": "yaroslav.gaponov@gmail.com",
    "birthday": "06/21/1977"
}'


curl -XGET 'http://localhost:8889/yag'


curl -XDELETE 'http://localhost:8889/yag'
