#!/bin/bash

echo "ENTER PREFIX"
read prefix
PREFIX="$prefix*"
redis-cli KEYS "$PREFIX" | xargs -r redis-cli DEL

echo "Deleted all keys with prefix: $PREFIX"

