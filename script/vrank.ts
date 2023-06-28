import { ethers } from "hardhat";
import { Header, commiterAddress, parseExtraData } from "../lib/hardhat/utils";

const period = 3600;
let council: string[] = [];

type Block = {
  blockNum: number;
  committers: string[];
};

type Blocks = {
  [blockNum: number]: Block;
};

type ValidatorScore = {
  nonVoteCnt: number;
  maxNonVoteCntCons: number;
  voteAdd: number;
  voteDeduct: number;
  voterScore: number;
};

type Scores = {
  blockNum: number;
} & {
  [address: string]: ValidatorScore;
};

/*
function apply(block: Block, scores: Scores): Scores {
  return null;
}
*/

async function getHeader(blockNum: number) {
  const header: Header = await ethers.provider.send("klay_getHeaderByNumber", [blockNum]);
  const extraData = parseExtraData(header.extraData);
  for (let i = 0; i < extraData.committedSeal.length; i++) {
    console.log(commiterAddress(header, i));
  }
}

async function main() {
  await getHeader(126008291);
  // get council
  // get block between [3600k, 3600(k+1)]
  // ecrecover each block, and count
  // apply vrank
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
