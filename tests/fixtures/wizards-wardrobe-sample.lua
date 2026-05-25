WizardsWardrobeSV = {
  ["Default"] = {
    ["@SampleAccount"] = {
      ["$AccountWide"] = {
        ["version"] = 1,
        ["selectedZoneTag"] = "GEN",
        ["autoEquipSetups"] = true,
        ["setups"] = {
          ["GEN"] = {
            [1] = {
              ["name"] = "General Setup",
              ["disabled"] = false,
              ["condition"] = {
                ["boss"] = "Trash",
                ["trash"] = -1,
              },
              ["skills"] = {
                [0] = {
                  [3] = 12345,
                  [8] = 67890,
                },
                [1] = {
                  [3] = 22222,
                },
              },
              ["cp"] = {
                [1] = 29,
              },
              ["food"] = {
                ["link"] = "|H1:item:123:1|h|h",
                ["id"] = 123,
              },
              ["gear"] = {
                [0] = {
                  ["id"] = "1",
                  ["link"] = "|H1:item:1:1|h|h",
                },
              },
            },
          },
        },
        ["pages"] = {
          ["GEN"] = {
            [0] = {
              ["123456789"] = 1,
            },
            [1] = {
              ["name"] = "General Page",
            },
          },
        },
        ["prebuffs"] = {
          [1] = {
            [0] = {
              ["toggle"] = false,
              ["delay"] = 500,
            },
            [3] = 12345,
          },
        },
      },
    },
  },
}
