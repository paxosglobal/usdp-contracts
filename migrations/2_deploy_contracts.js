const PAX = artifacts.require('PAXImplementation');
const Proxy = artifacts.require('AdminUpgradeabilityProxy');

module.exports = async function(deployer) {
  await deployer;

  await deployer.deploy(PAX);
  const proxy = await deployer.deploy(Proxy, PAX.address);
  const proxiedPAX = await PAX.at(proxy.address);
  await proxy.changeAdmin("0xf0b1eef88956b0a307fa87b5f5671aad6a5d330f");
  await proxiedPAX.initialize();
};
