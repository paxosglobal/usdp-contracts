const ACCOUNTS = [
  // mnuemonic key: glove breeze gas weapon learn pretty gather odor follow know silk genius
  {
    address: '0x4E7A5cDF71618F4E5908f2ECf764DDA108177279',
    key: '0x6bb6d96116b85e7837bf5ee0072010ae6f9d21c32d125b96ede1bd85cb263fb7'
  },
  {
    address: '0xd8f4F576Cf81DcbB273fb560657910CE54Ef7213',
    key: '0x1a7ce192b93aba4c57605f16be27890bb6a3dfe7e69c9c5fcd35c1fd165a4e58'
  },
  {
    address: '0xA4373aef2af7a995D7485B91D55DeD9cCD11Dd13',
    key: '0x6db827409c05fc41fb402895bcbd31824d179d26b1721bfff25543cb31fd13a5'
  },
  {
    address: '0x1e2bc0FaeCF8088a8aB9DFcBDAe1c9D0a3b6ba8d',
    key: '0x8e4a3a03bd449d144ee1500aaba2f9608a9025868d0a2a889a34073cba10a284'
  },
  {
    address: '0x36C4533b0aE72F6F1c7143F649E4f91E04a6d280',
    key: '0xd55cd6b9f80255883364d99ef68ac25a7726f40ed1f8eeba1f85c079139da0fd'
  },
  {
    address: '0xc879EE36c2BdB3E084D409666BAC98d47FEcF819',
    key: '0x9382b9f557481bc5e86e8867903cbdb07cfd87c7e17668274576632f73c6065e'
  },
  {
    address: '0x3B1123Fbd673Ea5cF9170d0403Ec4594a42CE665',
    key: '0xbb54dadf8fe2a0fdc16f9dab80f5b4845d1d85fd187eb9efa93f7aa203a4b86f'
  },
  {
    address: '0x7e0A7921Ae0F784e7A958915cAe094555D79dc88',
    key: '0xb67b9d7c53f016e72ceb5af701a92bac47f4aeafee68c9208066bd391301277b'
  },
  {
    address: '0x3aAb261CAb4ACc49a14fFDF763f66a2a52A9c884',
    key: '0x13b19cdafb5f7a2d49df84c35abf2056c8f3a2a8323f0baf5207b78557243f32'
  },
  {
    address: '0x2e88Ef8F31243b5FB29C23cfF31604D1C9d4917C',
    key: '0xd7276909a274cae1ae072e0581f2bb3c23b2b957f82bfd08c03d1ddc2076b263'
  },
  {
    address: '0xbA581A1346C4ed9cAfC83dCd5Db8fE9d3497F2f9',
    key: '0x981ea4d130f19cbf74b6dff12de0b394f7af80c7c575556aaee20fd97211b1b7'
  },
  {
    address: '0x42a91b1aaFA0dFFD81E71A83ca8A3a06Fc2158EC',
    key: '0xa46fe2d7f7add69e465e5593c0638b2374fc79bdd33fa4e92a319f6e303ff835'
  },
  {
    address: '0x3282d1B36C0499e22763E197C2d34fed927B0239',
    key: '0x1599501fcb2ac673c265194caaa9b0d9843597240ec6cefa69448f9afe4b6236'
  },
  {
    address: '0xB3B84dE908d82b9793418ed4737D01Fd83F06687',
    key: '0xfd13fa87665ecb00c838f14a7219fb08f92a329a8f2b6599296679ca771b5fd2'
  },
  {
    address: '0x53D204ee45b5a28b6b899A4623a0fcf22fa80a9f',
    key: '0x15713b3558cabda8f387cfdec6c193e80c1ce91a4426d58dd5e21ec32552a231'
  },
  {
    address: '0x550631A830Ec722F5293Fdd23616F803EE4C11FA',
    key: '0x7c7b2c002688b5f034aec77ebf50a8249aba9882845fe7f87fdec4c8ef86992e'
  },
  {
    address: '0x2e24Aa92875b0Ba47E081d7F7649E461F5890790',
    key: '0xb1705d7fe89c889cf4498d940a27767652390032089c888d716b8f6c07a16f46'
  },
  {
    address: '0x5d35E4bAce549195DA092618Eb95f4722615EB7d',
    key: '0xe82e053ba8f6e9fefed191b301658989bd39e16074b9386eaf524a029db1008c'
  },
  {
    address: '0x5F3F8f461c4EdF07EE3121E8a12eBd02e4384855',
    key: '0x9cec9c18b63724680214beb80254d86106aca257c1362b332ff75f26d4c165dd'
  },
  {
    address: '0x9e7433794a4e6EB3678139a7c9c20E05dA6AFD45',
    key: '0x998e1cb8d4f16f6b23c73ff5d248639a8bcfc73bb9f9d214a60ad9fcc48e1e11'
  },
  {
    address: '0x71e407E74dA87d220e1e3a3055D62008D1F99E47',
    key: '0xf6df8829d0d3cf30938432c0aa93109f871828a8188292eae12add68464418a6'
  },
  {
    address: '0xDd3B9B73eD6Dc25edD0D34a1F182774e8508cB88',
    key: '0xda2b853912a58c17855fda553164bade3d2cdc0a6eaf710dc225a09c61ccd9df'
  },
  {
    address: '0x0aDa31414974467d5e0b3C7C374a0AaC1e7259Aa',
    key: '0x48096d577087c273a51c16ea05af158f8c8e616ab80a54c0af5ec246bf1248d0'
  },
  {
    address: '0xcEf166fcE9B5C525F48B5835b758B0fd0AeD1335',
    key: '0xff4c2b666641586da93ae5da298d4d4bd78c114865eb401e2d37e44340c23262'
  },
  {
    address: '0xf3D32cb575A5fC6a5aCa0792F010718FE60222FA',
    key: '0x8a580665f722f1148ac0e2f3c902f7897052020f83e5fd6bc8092ec914d7b24c'
  },
  {
    address: '0xcB1CD1AB7D012A6bFE1D63BF0c698789287B6B77',
    key: '0x4c33ae9c41468f1b51ee0ed94e6f913ed2ecf6a6b07d34071c14a4d46a5b3e29'
  },
  {
    address: '0xBBC9DEa9F5C67D930356FDA210b77d1Fb5Ec0e89',
    key: '0x15a9c6c14b09d114994249880e9aa9c530e47685b2a6ca948cbcca993530a2b8'
  },
  {
    address: '0xC1706793A0Fa8D11F3AfdB79C58343AC17b83F48',
    key: '0xfc4788654e8d87aa65ed3f6610c256119b00128903f7c6803f2fb71e3d4a03c7'
  },
  {
    address: '0xa36e5b7ead0b98Fb39594634149E1fdE1946D381',
    key: '0xba72232a4943a43b60b38ed47d27ebf1d9de24d8cebc8cb769e9b09edacdac5e'
  },
  {
    address: '0x2A17af8F45199Aa145B88c577C8193c91fF7c484',
    key: '0x7795b03f4c87fee4a62a3cc8bb9bd2328e567aebb906ccae5875dc7ec6efd49b'
  }
];

module.exports = {
  ACCOUNTS
}