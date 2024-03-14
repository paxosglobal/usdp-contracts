const ecsign = require("ethereumjs-util");

const PERMIT_TYPEHASH = web3.utils.keccak256(
  "Permit(address owner,address spender,uint256 value,uint256 nonce,uint256 deadline)"
);

const TRANSFER_WITH_AUTHORIZATION_TYPEHASH = web3.utils.keccak256(
  "TransferWithAuthorization(address from,address to,uint256 value,uint256 validAfter,uint256 validBefore,bytes32 nonce)"
);

const RECEIVE_WITH_AUTHORIZATION_TYPEHASH = web3.utils.keccak256(
  "ReceiveWithAuthorization(address from,address to,uint256 value,uint256 validAfter,uint256 validBefore,bytes32 nonce)"
);

const CANCEL_AUTHORIZATION_TYPEHASH = web3.utils.keccak256(
  "CancelAuthorization(address authorizer,bytes32 nonce)"
);

const MAX_UINT256 =
  "0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff";

module.exports = {
  signPermit,
  signTransferAuthorization,
  signReceiveAuthorization,
  signCancelAuthorization,
  PERMIT_TYPEHASH,
  TRANSFER_WITH_AUTHORIZATION_TYPEHASH,
  RECEIVE_WITH_AUTHORIZATION_TYPEHASH,
  CANCEL_AUTHORIZATION_TYPEHASH,
  MAX_UINT256,
}

function strip0x(v) {
  return v.replace(/^0x/, "");
}


function signPermit(
  owner,
  spender,
  value,
  nonce,
  deadline,
  domainSeparator,
  privateKey
) {
  return signEIP712(
    domainSeparator,
    PERMIT_TYPEHASH,
    ["address", "address", "uint256", "uint256", "uint256"],
    [owner, spender, value, nonce, deadline],
    privateKey
  );
}

function signTransferAuthorization(
  from,
  to,
  value,
  validAfter,
  validBefore,
  nonce,
  domainSeparator,
  privateKey
) {
  return signEIP712(
    domainSeparator,
    TRANSFER_WITH_AUTHORIZATION_TYPEHASH,
    ["address", "address", "uint256", "uint256", "uint256", "bytes32"],
    [from, to, value, validAfter, validBefore, nonce],
    privateKey
  );
}

function signReceiveAuthorization(
  from,
  to,
  value,
  validAfter,
  validBefore,
  nonce,
  domainSeparator,
  privateKey
) {
  return signEIP712(
    domainSeparator,
    RECEIVE_WITH_AUTHORIZATION_TYPEHASH,
    ["address", "address", "uint256", "uint256", "uint256", "bytes32"],
    [from, to, value, validAfter, validBefore, nonce],
    privateKey
  );
}

function signCancelAuthorization(
  signer,
  nonce,
  domainSeparator,
  privateKey
) {
  return signEIP712(
    domainSeparator,
    CANCEL_AUTHORIZATION_TYPEHASH,
    ["address", "bytes32"],
    [signer, nonce],
    privateKey
  );
}

function signEIP712(
  domainSeparator,
  typeHash,
  types,
  parameters,
  privateKey
) {
  const digest = web3.utils.keccak256(
    "0x1901" +
    strip0x(domainSeparator) +
    strip0x(
      web3.utils.keccak256(
        web3.eth.abi.encodeParameters(
          ["bytes32", ...types],
          [typeHash, ...parameters]
        )
      )
    )
  );

  return ecSign(digest, privateKey);
}

function ecSign(digest, privateKey) {
  const { v, r, s } = ecsign.ecsign(
    bufferFromHexString(digest),
    bufferFromHexString(privateKey)
  );

  return { v, r: hexStringFromBuffer(r), s: hexStringFromBuffer(s) };
}

function bufferFromHexString(hex) {
  return Buffer.from(strip0x(hex), "hex");
}

function hexStringFromBuffer(buf) {
  return "0x" + buf.toString("hex");
}