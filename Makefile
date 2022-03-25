export PATH := /bin:/sbin:/usr/bin:/usr/sbin:/usr/local/bin:/usr/local/sbin:$PATH

all: build upload

build:
	yarn build
	cd dist && zip ../dist.zip --filesync -r .

upload:
	aws --profile waf lambda update-function-code --function-name wtf --zip-file=fileb://dist.zip

clean:
	rm -rf node_modules/ dist/ package.lock.json

init:
	npm install
