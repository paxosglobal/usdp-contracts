const Stablecoin = artifacts.require('StablecoinImplementation');
const Proxy = artifacts.require('ERC20Proxy');

module.exports = async function(deployer) {
  await deployer;

  stablecoin = await deployer.deploy(Stablecoin);
  const proxy = await deployer.deploy(Proxy, Stablecoin.address);
  const proxiedStablecoin = await Stablecoin.at(proxy.address);
  await proxiedStablecoin.initialize();
};
