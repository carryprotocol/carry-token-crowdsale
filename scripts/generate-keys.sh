#!/bin/sh
# The Carry token and the tokensale contracts
# Copyright (C) 2018 Carry Protocol
#
# This program is free software: you can redistribute it and/or modify
# it under the terms of the GNU General Public License as published by
# the Free Software Foundation, either version 3 of the License, or
# (at your option) any later version.
#
# This program is distributed in the hope that it will be useful,
# but WITHOUT ANY WARRANTY; without even the implied warranty of
# MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
# GNU General Public License for more details.
#
# You should have received a copy of the GNU General Public License
# along with this program.  If not, see <https://www.gnu.org/licenses/>.
if [ $# -lt 1 ]; then
  {
    echo "usage: $0 NUM"
    echo
    echo "Generate multiple Ethereum private keys."
  } > /dev/stderr
  exit 1
fi

if ! command -v openssl > /dev/null; then
  echo "error: openssl is not available" > /dev/stderr
  exit 1
fi

for _ in $(seq 1 "$1"); do
  openssl ecparam -name secp256k1 -genkey -noout \
    | openssl ec -text -noout 2> /dev/null \
    | awk '
      /^priv: *$/{x=1}
      /^pub: *$/{x=0}
      x&&/^ /{gsub(/:/,"",$1);print $1}
    ' \
    | tr -d '\n' \
    | tail -c 64
  echo
done
