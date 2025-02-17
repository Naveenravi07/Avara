#!/bin/bash

PREFIX="admission:*"

redis-cli KEYS "$PREFIX" | xargs -r redis-cli DEL

echo "Deleted all keys with prefix: $PREFIX"

