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

# # delete launch templates
ltmps=$(aws ec2  describe-launch-templates \
    | jq -r .LaunchTemplates[].LaunchTemplateId)
  if [ "${ltmps}" != "null" ]; then
    for ltmp in ${ltmps}; do
      echo "Deleting Launch Templates ${ltmp}"
      aws ec2  delete-launch-template --launch-template-id ${ltmp}
    done
  fi


 # delet autoscalling groups
 ags=$(aws autoscaling describe-auto-scaling-groups|jq -r .AutoScalingGroups[0].AutoScalingGroupName)

  if [ "${ags}" != "null" ]; then
    echo "Detaching and deleting autoscalling group ${ags}"
    aws autoscaling --auto-scaling-group-name ${ags}
  fi

#  # delete natgw
 natgw=$(aws ec2 --region eu-central-1 \
    describe-nat-gateways --filter Name=vpc-id,Values=${vpc} \
    |jq .NatGateways[0].NatGatewayId)

  if [ "${natgw}" != "null" ]; then
    echo "Detaching and deleting natgw ${natgw}"
    aws ec2 delete-nat-gateway --nat-gateway-id ${natgw}
  fi


#   #get routing tables
  rt=$(aws ec2 --region eu-central-1 \
    describe-route-tables --filter Name=vpc-id,Values=${vpc}|jq -r .RouteTables[0].RouteTableId)
   if [ "${rt}" != "null" ]; then
    echo "Detaching and deleting route table ${rt}"
    aws ec2 delete-route-table --route-table-id ${rt}
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


#   # delete default vpc
  echo "Deleting vpc ${vpc}"
  aws ec2 --region eu-central-1 \
    delete-vpc --vpc-id ${vpc}
