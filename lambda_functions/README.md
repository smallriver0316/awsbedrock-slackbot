# Lambda functions

## How to prepare

Install python packages in your local environment.

```bash
cd publisher/
pipenv install

# launch vertual environment
pipenv shell
```

It is necessary to install python packages before deployment.

```bash
cd starter/
pipenv requirements > requirements.txt
pip install -r requirements.txt -t src/

cd ../worker/
# do the same things for subscriber
```
