const AWS = require('aws-sdk');
require('../lib/flatMap');
require('dotenv').config()

const results = {};

async function getRegions() {
  const ec2 = new AWS.EC2({ region: 'us-west-2' });
  const { Regions: regions } = await ec2.describeRegions().promise();
  return regions.map(({ RegionName }) => RegionName);
}

async function getInstances(ec2) {
  return ec2.describeInstances().promise();
}

async function amisInUse(ec2) {
  const { Reservations: reservations } = await getInstances(ec2);
  const amis = new Set(
    reservations
      .flatMap(({ Instances }) => Instances)
      .map(({ ImageId }) => ImageId)
  );
  return [...amis];
}

async function getAmiInfo(ec2, amis) {
  const { Images: images } = await ec2.describeImages({ ImageIds: amis }).promise();
  return images.map(({ ImageId, Name, Description, ImageLocation }) => ({ ImageId, Name, Description, ImageLocation }));
}

async function processRegion(region) {
  const ec2 = new AWS.EC2({ region });
  const amis = await amisInUse(ec2);

  if(amis.length === 0) {
    return;
  }

  const amiInfos = await getAmiInfo(ec2, amis);
  results[region] = amiInfos;
}

async function main() {
  const regions = await getRegions();
  await Promise.all(regions.map(processRegion));

  Object
    .entries(results)
    .forEach(([region, amiInfos]) => {
      console.log(`=== ${region} ===`);
      amiInfos.forEach(info => console.log(info));
      console.log();
    });
}

main()
  .then(() => console.log('Completed!'))
  .catch(console.log)

