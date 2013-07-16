#!/bin/bash

echo -e "\nsave data to storage..."
curl -XPOST 'http://localhost:8889/yag' -d '
{
    "name": "Yaroslav",
    "surname": "Gaponov",
    "email": "yaroslav.gaponov@gmail.com",
    "birthday": "06/21/1977"
}'

echo -e "\nget data from storage..."
curl -XGET 'http://localhost:8889/yag'

echo -e "\ndelete data from storage..."
curl -XDELETE 'http://localhost:8889/yag'
