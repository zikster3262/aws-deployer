#!/usr/bin/env bash





  # get default vpc
  vpc=$(aws ec2 --region eu-central-1 \
    describe-vpcs \
    | jq -r .Vpcs[0].VpcId)

  # get internet gateway
  igw=$(aws ec2 --region eu-central-1 \
    describe-internet-gateways --filter Name=attachment.vpc-id,Values=${vpc} \
    | jq -r .InternetGateways[0].InternetGatewayId)
  if [ "${igw}" != "null" ]; then
    echo "Detaching and deleting internet gateway ${igw}"
    aws ec2 --region eu-central-1 \
      detach-internet-gateway --internet-gateway-id ${igw} --vpc-id ${vpc}
    aws ec2 --region eu-central-1 \
      delete-internet-gateway --internet-gateway-id ${igw}
  fi

  # get subnets
  subnets=$(aws ec2 --region eu-central-1 \
    describe-subnets --filters Name=vpc-id,Values=${vpc} \
    | jq -r .Subnets[].SubnetId)
  if [ "${subnets}" != "null" ]; then
    for subnet in ${subnets}; do
      echo "Deleting subnet ${subnet}"
      aws ec2 --region eu-central-1 \
        delete-subnet --subnet-id ${subnet}
    done
  fi

  # delete default vpc
  echo "Deleting vpc ${vpc}"
  aws ec2 --region eu-central-1 \
    delete-vpc --vpc-id ${vpc}


# mongosh "mongodb+srv://zikster:Tran3262@app.hykmu.mongodb.net/myFirstDatabase"
# use AWS
# db.vpcs.remove({})