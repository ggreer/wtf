export PATH := /bin:/sbin:/usr/bin:/usr/sbin:/usr/local/bin:/usr/local/sbin:$PATH

all: dist upload

build:
	yarn build

dist: clean build
	mkdir -p dist
	cd dist && zip ../dist.zip --filesync -r .

upload:
	aws --profile waf lambda update-function-code --function-name wtf --zip-file=fileb://dist.zip

full-clean: clean
	rm -rf node_modules/ package.lock.json

clean:
	rm -rf dist/ *.zip

init:
	npm install
