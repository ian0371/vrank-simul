package main

import (
	"fmt"
	"math/big"
	"os"
	"time"

	"github.com/klaytn/klaytn/cmd/utils"
	"github.com/klaytn/klaytn/cmd/utils/nodecmd"
	"github.com/klaytn/klaytn/common"
	"github.com/klaytn/klaytn/consensus/istanbul/backend"
	"github.com/klaytn/klaytn/networks/p2p"
	"github.com/klaytn/klaytn/networks/p2p/discover"
	"github.com/klaytn/klaytn/node/cn"
	"github.com/klaytn/klaytn/params"
	"gopkg.in/urfave/cli.v1"
)

func setUp(ctx *cli.Context) {
	if len(ctx.GlobalString(utils.NodeKeyHexFlag.Name)) != 64 {
		ctx.Set(utils.NodeKeyHexFlag.Name, "000000000000000000000000000000000000000000000000000000000000dead")
		fmt.Println("Setting nodekeyhex to default")
	}

	protocols := make([]p2p.Protocol, 0, len(backend.IstanbulProtocol.Versions))
	for i, version := range backend.IstanbulProtocol.Versions {
		if version < 65 {
			continue
		}

		protocols = append(protocols, p2p.Protocol{
			Name:    backend.IstanbulProtocol.Name,
			Version: version,
			Length:  backend.IstanbulProtocol.Lengths[i],
			Run: func(p *p2p.Peer, rw p2p.MsgReadWriter) error {
				msg, err := rw.ReadMsg()
				if err != nil {
					return err
				}
				fmt.Println("[Run] Peer", p, "msg", msg)
				return nil
			},
			RunWithRWs: func(p *p2p.Peer, rws []p2p.MsgReadWriter) error {
				for _, rw := range rws {
					msg, err := rw.ReadMsg()
					if err != nil {
						return err
					}
					fmt.Println("[RunWithRWs] Peer", p, "msg", msg)
				}
				return nil
			},
			NodeInfo: func() interface{} {
				return &cn.NodeInfo{
					Network:    params.CypressNetworkId,
					BlockScore: big.NewInt(1),
					Genesis:    common.HexToHash("0xc72e5293c3c3ba38ed8ae910f780e4caaa9fb95e79784f7ab74c3c262ea7137e"),
					Config:     params.CypressChainConfig,
					Head:       common.HexToHash("0xd1c2c178d8c24a67e4ec9f7593a63c0f79c89688e7a983f3f832dc66a760bef6"), // hash of 126007200
				}
			},
			PeerInfo: func(id discover.NodeID) interface{} {
				fmt.Println("PeerInfo called")
				return []
			},
		})
	}

	_, klayConfig := utils.MakeConfigNode(ctx)

	server := p2p.NewServer(klayConfig.Node.P2P)
	node, _ := discover.ParseNode("kni://8318535b54105d4a7aae60c08fc45f9687181b4fdfc625bd1a753fa7397fed753547f11ca8696646f2f3acb08e31016afac23e630c5d11f59f61fef57b0d2aa5@3.38.95.49:32324?discport=0&ntype=cn")

	server.AddProtocols(protocols)

	ch := make(chan *p2p.PeerEvent)
	server.SubscribeEvents(ch)
	go func() {
		for {
			select {
			case v := <-ch:
				fmt.Println("message received!!!", v)
			default:
				time.Sleep(2 * time.Second)
			}
		}
	}()
	// server.AddProtocols([]p2p.Protocol{})

	err := server.Start()
	if err != nil {
		panic(err)
	}

	server.AddPeer(node)

	// fmt.Println(server)
	// fmt.Println(server.GetProtocols())

	/*
		peer = cn.Peer
		peer.Handshake(pm.networkId, pm.getChainID(), td, hash, genesis.Hash())
		peer.RequestHeadersByHash()
		peer.FetchBlockHeader()
		peer.GetRW().ReadMsg()
		p2p.Send()
	*/
}

func main() {
	app := utils.NewApp(nodecmd.GetGitCommit(), "The command line interface for Klaytn Consensus Node")
	app.Action = setUp
	app.Flags = nodecmd.KenAppFlags()

	if err := app.Run(os.Args); err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}
}
