#!/usr/bin/env node
'use strict';
const { Bot }         = require('euphoria.js');
const { spawn, fork } = require('child_process');

const k               = 'account:03oav0qe3ah34';

// TODO:
// clearer documentation
// sometimes doesn't reply at all, is confusing, something about the regex filter agaist it spamming to much, sumairu said add \e
// individual addressing of instances
// I can create children for non-existing rooms
// childid not reported when .child
// add capabilities to control lcok and control children from nexus in a way that can't easily be screwed with
// issues with euphoria.js:
// add send raw to allow ID sending without changing it to nick
// wont fix
//   invalid name changes possible, ????
//   happy will let a bot connect to a non-existing room???

function master (room = process.argv[2]) {
    const bot      = new Bot('nexus', room, {reconect: true, stateless: true});
    const children = [];

    let prefix     = ".";

    bot.commands['!help'] = bot._make_reaction('This is a bot which runs scripts on demand.');
    bot.commands[`!help ${bot.self}`] = bot._make_reaction(`In case of emergency or abuse please !kill this bot to remove all existing shell bots (node, bash, etc). This is the manager instance of the shell bots and can only be controlled by @K his account. Ask @K to make a shell for you!`);

    attach_listeners_master(bot)

		process.once('exit', () => {
        children.forEach(child => child.kill())
		});

    return bot;

    function attach_listeners_master (bot) {
        // TODO: child should be an object with meta information such as status, room, nick, etc
        bot.on('ready', () => {
            bot.on('post', data => {
                if ( data.sender.id === k && data.bot.parsed.startsWith(prefix) ) {
                    const input = data.bot.parsed.slice(prefix.length);
                    switch (true) {
                    case input === 'children':
                        bot.post(JSON.stringify(children), data.id)
                        break;
                    // case input === 'children':
                    //     bot.post(JSON.stringify(children))
                    //     break;
                    case input === 'c':
                        const ch = fork(process.argv[1], ["test"],
                                           {
                                               stdio: ['inherit', 'inherit', 'inherit', 'ipc']
                                           });
                        const cid = children.length;
                        ch.on("message", (x) => {
                            console.log(x);
                            switch (x.type) {
                            case "ready":
                                bot.post(`child ${cid} ${x.data.id} initialized in ${x.data.room}`, data.id);
                                break;
                            }
                        });
                        children.push(ch);
                        bot.post(`child ${cid} created`, data.id);
                        break;
                    case input.startsWith('kill'):
                        if (!input.match(/\d+/))
                            break;
                        const victim = children[input.match(/(\d+)/)[1]]
                        if (victim)
                            victim.kill();
                        break;
                    case input.startsWith('child'):
                        if (!input.match(/&\w+/))
                            break;
                        const child = fork(process.argv[1], [input.match(/&(\w+)/)[1]],
                                           {
                                               stdio: ['inherit', 'inherit', 'inherit', 'ipc']
                                           });
                        child.on("message", (...x) => {
                            console.log(x);
                        });
                        children.push(child);
                        bot.post(`child ${child._id} created`, data.id);
                        break;
                    default:
                        console.log(`${data.sender.name}: ${input}`)
                        try {
                            bot.post(`${eval(input)}`, data.id);
                        } catch (e) {
                            bot.post(`${e}`, data.id);
                        }
                        break;
                    }
                }
            });
        });
    }
}

function worker () {
    let shell = false;
    let lock = false;
    let owner = false;

    const bot = new Bot('node', process.argv[2], {reconect: true, stateless: true});

    let prefix = `${bot.self} `;
    let nick   = 'node';

    bot.commands['!help'] = bot._make_reaction('I\'m a repl bot!');
    bot.commands[`!help ${bot.self}`] = id => bot.post(`
my capabilities depend on my mode:
default nick :  \`${nick}\`
prefix :  \`${prefix}\`
UUID :  \`${bot.self.replace('-','‒')}\`

default mode (node) commands:
 - bash
   start a bash shell.
 - sh
   start a sh shell.
 - nix
   start a nix repl.
 - gforth
   start a gforth process.
 - haskell
   start a haskell repl.
 - ruby
   start a ruby repl.
 - python
   start a python repl.
 - claim
   claim the exclusive usage of this bot.
 - lock
   lock this bot from all but the owner.
 - unlock
   unlock this bot to be used by all.
 - exit
   quit any shell to node.

anything else is ran inside my own process (a nodejs instance). I am made using euphoria.js, use the bot object to interact with my euphoria.js bot instance.
you can change my default nick and prefix as follows:

\`${prefix} nick   = 'new nick'\`
\`${prefix} prefix = 'new prefix'\`

feel free to overwrite any of my functionality.
`, id);

    bot.on('ready', () => {
        process.send({type: "ready", data: {id: bot.self, room: bot.room}});
        // bot.post(`hello! talk to me using \`${prefix}\``);
        bot.on('post', data => {
            // console.log(data)
            if(data.sender.id === k || !lock || data.sender.id === owner) {
                if (data.bot.parsed.startsWith(prefix)) {
                    const input = data.bot.parsed.slice(prefix.length).trim();
                    switch (true) {
                    case input === 'unlock':
                        lock = false;
                        bot.reply(`bot unlocked!`);
                        break;
                    case input === 'lock':
                        lock = true;
                        if (owner)
                            bot.reply(`bot locked with exception to ${owner}!`);
                        else
                            bot.reply(`bot locked!`);
                        break;
                    case input === 'claim':
                        owner = data.sender.id;
                        lock = true;
                        bot.reply(`bot locked with exception to ${owner}!`);
                        break;
                    case input === 'bash':
                        // TODO: chroot this
                        if (shell)
                            break;
                        shell = spawn("bash",
                                      {
                                          stdio: ['pipe', 'pipe', 'pipe']
                                      })

                        bot.nick = `${nick}::bash`;
                        bot.reply(`bash started, use ${prefix} as a prefix to execute bash statements`);
                        shell.stdout.on('data', (data) => {
                            let output = data.toString().replace(/\[[\d;]+m/g, "");
                            bot.reply(`${output}`);
                            console.log(`stdout: ${data}`)
                        });

                        shell.stderr.on('data', (data) => {
                            let output = data.toString().replace(/\[[\d;]+m/g, "");
                            bot.reply(`${output}`);
                            console.log(`stderr: ${data}`)
                        });

                        shell.on('exit', _ => {
                            bot.nick = "node";
                            shell = false;
                            prefix = `${bot.self} `;
                        })
                        break;
                    case input.startsWith('ruby'):
                        if (shell)
                            break;
                        shell = spawn("irb",
                                      {
                                          stdio: ['pipe', 'pipe', 'pipe']
                                      })

                        bot.nick = `${nick}::ruby`;
                        bot.reply(`irb started, use \`${prefix}\` as a prefix to execute ruby statements`);
                        shell.stdout.on('data', (data) => {
                            let output = data.toString().replace(/\[[\d;]+m/g, "");
                            bot.reply(`${output}`);
                            console.log(`stdout: ${data}`)
                        });

                        shell.stderr.on('data', (data) => {
                            let output = data.toString().replace(/\[[\d;]+m/g, "");
                            bot.reply(`${output}`);
                            console.log(`stderr: ${data}`)
                        });

                        shell.on('exit', _ => {
                            bot.nick = "node";
                            shell = false;
                            prefix = `${bot.self} `;
                        })
                        break;
                    case input.startsWith('sh'):
                        if (shell)
                            break;
                        shell = spawn("/bin/sh",
                                      {
                                          stdio: ['pipe', 'pipe', 'pipe']
                                      })

                        bot.nick = `${nick}::sh`;
                        bot.reply(`sh started, use \`${prefix}\` as a prefix to execute sh statements`);
                        shell.stdout.on('data', (data) => {
                            let output = data.toString().replace(/\[[\d;]+m/g, "");
                            bot.reply(`${output}`);
                            console.log(`stdout: ${data}`)
                        });

                        shell.stderr.on('data', (data) => {
                            let output = data.toString().replace(/\[[\d;]+m/g, "");
                            bot.reply(`${output}`);
                            console.log(`stderr: ${data}`)
                        });

                        shell.on('exit', _ => {
                            bot.nick = "node";
                            shell = false;
                            prefix = `${bot.self} `;
                        })
                        break;
                    case input.startsWith('python'):
                        if (shell)
                            break;
                        shell = spawn("python",
                                      {
                                          stdio: ['pipe', 'pipe', 'pipe']
                                      })

                        bot.nick = `${nick}::python`;
                        bot.reply(`python started, use \`${prefix}\` as a prefix to execute python statements`);
                        shell.stdout.on('data', (data) => {
                            let output = data.toString().replace(/\[[\d;]+m/g, "");
                            bot.reply(`${output}`);
                            console.log(`stdout: ${data}`)
                        });

                        shell.stderr.on('data', (data) => {
                            let output = data.toString().replace(/\[[\d;]+m/g, "");
                            bot.reply(`${output}`);
                            console.log(`stderr: ${data}`)
                        });

                        shell.on('exit', _ => {
                            bot.nick = "node";
                            shell = false;
                            prefix = `${bot.self} `;
                        })
                        break;
                    case input.startsWith('haskell'):
                        if (shell)
                            break;
                        shell = spawn("stack", ["repl"],
                                      {
                                          stdio: ['pipe', 'pipe', 'pipe']
                                      })

                        bot.nick = `${nick}::stack`;
                        bot.reply(`haskell repl started, use \`${prefix}\` as a prefix to execute nix statements. Exit using \`exit\`.`);

                        shell.stdout.on('data', (data) => {
                            let output = data.toString().replace(/\[[\d;]+m/g, "");
                            bot.reply(`${output}`);
                            console.log(`stdout: ${data}`)
                        });

                        shell.stderr.on('data', (data) => {
                            let output = data.toString().replace(/\[[\d;]+m/g, "");
                            bot.reply(`${output}`);
                            console.log(`stderr: ${data}`)
                        });

                        shell.on('exit', _ => {
                            bot.nick = "node";
                            shell = false;
                            prefix = `${bot.self} `;
                        })
                        break;
                    case input.startsWith('nix'):
                        if (shell)
                            break;
                        shell = spawn("nix", ["repl"],
                                      {
                                          stdio: ['pipe', 'pipe', 'pipe']
                                      })

                        bot.nick = `${nick}::nix`;
                        bot.reply(`nix repl started, use \`${prefix}\` as a prefix to execute nix statements. Exit using \`exit\`.`);

                        shell.stdout.on('data', (data) => {
                            let output = data.toString().replace(/\[[\d;]+m/g, "");
                            bot.reply(`${output}`);
                            console.log(`stdout: ${data}`)
                        });

                        shell.stderr.on('data', (data) => {
                            let output = data.toString().replace(/\[[\d;]+m/g, "");
                            bot.reply(`${output}`);
                            console.log(`stderr: ${data}`)
                        });

                        shell.on('exit', _ => {
                            bot.nick = `${nick}`;
                            shell = false;
                        })
                        break;
                    case input.startsWith('gforth'):
                        if (shell)
                            break;
                        shell = spawn("gforth", [],
                                      {
                                          stdio: ['pipe', 'pipe', 'pipe']
                                      })

                        bot.nick = `${nick}::gforth`;
                        bot.reply(`gforth repl started, use \`${prefix}\` as a prefix to execute gforth statements. Exit using \`exit\`.`);

                        shell.stdout.on('data', (data) => {
                            let output = data.toString().replace(/\[[\d;]+m/g, "");
                            bot.reply(`${output}`);
                            console.log(`stdout: ${data}`)
                        });

                        shell.stderr.on('data', (data) => {
                            let output = data.toString().replace(/\[[\d;]+m/g, "");
                            bot.reply(`${output}`);
                            console.log(`stderr: ${data}`)
                        });

                        shell.on('exit', _ => {
                            bot.nick = `${nick}`;
                            shell = false;
                        })
                        break;
                    case input.startsWith('exit'):
                        if (shell) {
                            bot.nick = `${nick}`;
                            shell = false;
                        }
                        break;
                    default:
                        console.log(`${data.sender.name}: ${input}`)
                        if (shell) {
                            shell.stdin.write(`${data.bot.parsed.slice(prefix.length)}\n`);
                        } else {
                            try {
                                bot.reply(`\`${eval(input)}\``);
                            } catch (e) {
                                bot.reply(`Error:\`${e}\``);
                            }
                        }
                        break;
                    }

                }
            }
        });
    });
}

//https://nodejs.org/api/process.html#process_process_send_message_sendhandle_options_callback
if (process.send === undefined) {
    master();
} else {
    worker();
}


