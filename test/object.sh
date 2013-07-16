#!/bin/bash

echo -e "\nsave object to storage..."
curl -XPOST 'http://localhost:8889/_object/yag' -d '
{
    "name": "Yaroslav",
    "surname": "Gaponov",
    "email": "yaroslav.gaponov@gmail.com",
    "birthday": "06/21/1977"
}'

echo -e "\nget property name from object..."
curl -XGET 'http://localhost:8889/_object/yag/name'


echo -e "\ndelete property birthday from object..."
curl -XDELETE 'http://localhost:8889/_object/yag/birthday'
curl -XGET 'http://localhost:8889/_object/yag'
