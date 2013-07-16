#!/bin/bash

echo -e "\nsave item to array..."
curl -XPOST 'http://localhost:8889/_array/cities' -d '
{
    "city": "Kyyv"
}'


echo -e "\nsave item to array..."
curl -XPOST 'http://localhost:8889/_array/cities' -d '
{
    "city": "London"
}'

echo -e "\nsave item to array ..."
curl -XPOST 'http://localhost:8889/_array/cities' -d '
{
    "city": "Paris"
}'

echo -e "\nget all array..."
curl -XGET 'http://localhost:8889/_array/cities'

echo -e "\nget only 2 item from array..."
curl -XGET 'http://localhost:8889/_array/cities/1'


echo -e "\ndelete only 3 item from array..."
curl -XDELETE 'http://localhost:8889/_array/cities/2'
curl -XGET 'http://localhost:8889/_array/cities'


echo -e "\ndelete all array..."
curl -XDELETE 'http://localhost:8889/_array/cities'
curl -XGET 'http://localhost:8889/_array/cities'

