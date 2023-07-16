module("luci.controller.ipsec_ui", package.seeall)

local config = "ipsec"

local file_path = "/mnt/config"

local sc_read_local_id = "cat /etc_ipsec/swanctl/x509/james_enc_cert.pem | grep 'Subject:' | cut -d':' -f2 | sed -e 's/^ *//' -e 's/ *$//'"
local sc_read_tunnel_state = "echo \"Completed\""
local sc_start_tunnel = "echo \"%s tunnel started\" >> /tmp/out.log"
local sc_stop_tunnel = "echo \"%s tunnel stopped\" >> /tmp/out.log"
local sc_status_tunnel = "echo 3"

local io = require "io"
local os = require "os"
local uci = require "luci.model.uci".cursor()


function index()

	if not nixio.fs.access("/etc/config/ipsec") then
		return
	end

	entry({"admin", "network", "ipsec_ui", "new"}, call("render_new"), nil)
	entry({"admin", "network", "ipsec_ui", "new_manual"}, call("render_new_manual"), nil)
	entry({"admin", "network", "ipsec_ui", "edit"}, call("render_edit"), nil)

	entry({"admin", "network", "ipsec_ui", "start"}, call("action_start"), nil)
	entry({"admin", "network", "ipsec_ui", "stop"}, call("action_stop"), nil)
	entry({"admin", "network", "ipsec_ui", "status"}, call("action_status"), nil)
	entry({"admin", "network", "ipsec_ui", "export"}, call("action_export"), nil)
end


-- Get local id from file
function get_local_id()

	local success, output = pcall(function()
		return io.popen(string.format(sc_read_local_id, row_id)):read()
	end)
	if success then
		return output
	else
		return ""
	end
end


-- Check row id if exists
function exist_row_id(row_id)
	local exists = false
	uci:foreach(config, "connections", function(m_conn)
		if m_conn[".name"] == row_id then
			exists = true
		end
	end)
	return exists
end


-- Get row object from connections section
function get_row(s_conn)

	-- Get local section
	local s_local = {}
	uci:foreach(config, "local", function(m_local)
		if m_local.parent == s_conn[".name"] then
			s_local = m_local
		end
	end)
	-- Get remote section
	local s_remote = {}
	uci:foreach(config, "remote", function(m_remote)
		if m_remote.parent == s_conn[".name"] then
			s_remote = m_remote
		end
	end)
	-- Get children section
	local s_child = {}
	uci:foreach(config, "children", function(m_child)
		if m_child.parent == s_conn[".name"] then
			s_child = m_child
		end
	end)
	-- Return row
	return {
		id = s_conn[".name"],
		s_conn = s_conn,
		s_local = s_local,
		s_remote = s_remote,
		s_child = s_child
	}
end


-- Save row from the form values
function save_row()

	-- Get row id
	row_id = luci.http.formvalue("row.id")
	-- Save connections section
	local s_conn = {}
	for key, value in pairs(luci.http.formvaluetable("row.s_conn")) do
		s_conn[key] = value
	end
	uci:section(config, "connections", row_id, s_conn)
	-- Save local section
	local s_local = { parent = row_id }
	for key, value in pairs(luci.http.formvaluetable("row.s_local")) do
		s_local[key] = value
	end
	uci:section(config, "local", nil, s_local)
	-- Save remote section
	local s_remote = { parent = row_id }
	for key, value in pairs(luci.http.formvaluetable("row.s_remote")) do
		s_remote[key] = value
	end
	uci:section(config, "remote", nil, s_remote)
	-- Save children section
	local s_child = { parent = row_id }
	for key, value in pairs(luci.http.formvaluetable("row.s_child")) do
		s_child[key] = value
	end
	uci:section(config, "children", nil, s_child)
	-- Commit and reload UCI config
	uci:commit(config)
	uci:load(config)
	-- Save files
	luci.util.exec(string.format("mkdir -p %s/%s", file_path, row_id))
	luci.http.setfilehandler(function(meta, chunk, eof)
		local file = io.open(string.format("%s/%s/%s", file_path, row_id, meta.name), "w")
		if file then
			if chunk then
				file:write(chunk)
			end
			if eof then
				file:close()
			end
		end
	end)
end


-- Delete row by row id
function delete_row(row_id)

	-- Delete connections section
	uci:delete(config, row_id)
	-- Delete local section
	uci:foreach(config, "local", function(m_local)
		if m_local.parent == row_id then
			uci:delete(config, m_local[".name"])
		end
	end)
	-- Delete remote section
	uci:foreach(config, "remote", function(m_remote)
		if m_remote.parent == row_id then
			uci:delete(config, m_remote[".name"])
		end
	end)
	-- Delete children section
	uci:foreach(config, "children", function(m_child)
		if m_child.parent == row_id then
			uci:delete(config, m_child[".name"])
		end
	end)
	-- Commit and reload UCI config
	uci:commit(config)
	uci:load(config)
	-- Delete files
	luci.util.exec(string.format("rm -rf %s/%s", file_path, row_id))
end


-- Copy row by row id
function copy_row(row_id, new_id)

	-- Get connections section
	local s_conn = {}
	uci:foreach(config, "connections", function(m_conn)
		if m_conn[".name"] == row_id then
			for key, value in pairs(m_conn) do
				if string.sub(key, 1, 1) ~= "." then
					s_conn[key] = value
				end
			end
		end
	end)
	-- Get local section
	local s_local = {}
	uci:foreach(config, "local", function(m_local)
		if m_local.parent == row_id then
			for key, value in pairs(m_local) do
				if string.sub(key, 1, 1) ~= "." then
					s_local[key] = value
				end
			end
		end
	end)
	s_local["parent"] = new_id
	-- Get remote section
	local s_remote = {}
	uci:foreach(config, "remote", function(m_remote)
		if m_remote.parent == row_id then
			for key, value in pairs(m_remote) do
				if string.sub(key, 1, 1) ~= "." then
					s_remote[key] = value
				end
			end
		end
	end)
	s_remote["parent"] = new_id
	-- Get children section
	local s_child = {}
	uci:foreach(config, "children", function(m_child)
		if m_child.parent == row_id then
			for key, value in pairs(m_child) do
				if string.sub(key, 1, 1) ~= "." then
					s_child[key] = value
				end
			end
		end
	end)
	s_child["parent"] = new_id
	-- Save sections
	uci:section(config, "connections", new_id, s_conn)
	uci:section(config, "local", nil, s_local)
	uci:section(config, "remote", nil, s_remote)
	uci:section(config, "children", nil, s_child)
	-- Commit and reload UCI config
	uci:commit(config)
	uci:load(config)
	-- Copy files
	luci.util.exec(string.format("cp -r %s/%s %s/%s", file_path, row_id, file_path, new_id))
end


-- Render overview page
function render_overview()

	-- Process actions
	if luci.http.getenv("REQUEST_METHOD") == "POST" then
		if luci.http.formvalue("action.delete") then  -- Delete action
			row_ids = luci.util.split(luci.http.formvalue("param.ids"), ",")
			for i, row_id in pairs(row_ids) do
				delete_row(row_id)
			end
		elseif luci.http.formvalue("action.copy") then  -- Copy action
			row_ids = luci.util.split(luci.http.formvalue("param.fids"), ",")
			new_ids = luci.util.split(luci.http.formvalue("param.tids"), ",")
			for i, row_id in pairs(row_ids) do
				delete_row(new_ids[i])
				copy_row(row_id, new_ids[i])
			end
		end
	end

	-- Get the rows
	local rows = {}
    uci:foreach(config, "connections", function(s_conn)
		-- Get row
		row = get_row(s_conn)
		-- Read tunnel state
		local success, output = pcall(function()
			return io.popen(string.format(sc_read_tunnel_state, row.id)):read()
		end)
		if success then
			row["state"] = output
		else
			row["state"] = "Error"
		end
		-- Append row
        table.insert(rows, row)
    end)

	-- Render page
	luci.template.render("ipsec_ui/overview", {
		rows = rows
	})
end


-- Render new page
function render_new()

	-- Process actions
	if luci.http.getenv("REQUEST_METHOD") == "POST" then
		if luci.http.formvalue("action.save") then  -- Save action
			local new_id = luci.http.formvalue("row.id") or ""
			if new_id == "" then
				luci.http.status(400, "row.id is empty")
			elseif exist_row_id(new_id) then
				luci.http.status(400, "row.id exists")
			else
				save_row()
			end
		end
	end

	-- Render page
	luci.template.render("ipsec_ui/new", {
		row = {},
		local_id = get_local_id()
	})
end


-- Render new page for manual
function render_new_manual()

	-- Process actions
	if luci.http.getenv("REQUEST_METHOD") == "POST" then
		if luci.http.formvalue("action.save") then  -- Save action
			local new_id = luci.http.formvalue("row.id") or ""
			if new_id == "" then
				luci.http.status(400, "row.id is empty")
			elseif exist_row_id(new_id) then
				luci.http.status(400, "row.id exists")
			else
				save_row()
			end
		end
	end

	-- Render page
	luci.template.render("ipsec_ui/new_manual", {
		row = {},
		local_id = get_local_id()
	})
end


-- Render edit page
function render_edit()

	-- Get the row id from url
	local url = luci.http.getenv("REQUEST_URI")
    local segments = url:split("/")
	local row_id = segments[#segments]

	-- Process actions
	if luci.http.getenv("REQUEST_METHOD") == "POST" then
		if luci.http.formvalue("action.save") then  -- Save action
			local new_id = luci.http.formvalue("row.id") or ""
			if new_id == "" then
				luci.http.status(400, "row.id is empty")
			elseif exist_row_id(new_id) and row_id ~= new_id then
				luci.http.status(400, "row.id exists")
			else
				delete_row(row_id)
				save_row()
			end
		end
	end

	-- Get the row of given row id
	local row = {
		s_conn = {},
		s_local = {},
		s_remote = {},
		s_child = {}
	}
	uci:foreach(config, "connections", function(s_conn)
		if s_conn[".name"] == row_id then
			row = get_row(s_conn)
		end
    end)

	-- Render page
	luci.template.render("ipsec_ui/edit", {
		row = row,
		local_id = get_local_id()
	})
end


-- Start tunnel
function action_start()

	-- Get the row id from url
	local url = luci.http.getenv("REQUEST_URI")
    local segments = url:split("/")
	local row_id = segments[#segments]

	-- Execute script
	local success, output = pcall(function()
		return io.popen(string.format(sc_start_tunnel, row_id)):read()
	end)

	-- Write response
	if success then
		luci.http.prepare_content("application/json")
		luci.http.write_json({ status = "ok", data = output })
	else
		luci.http.prepare_content("application/json")
		luci.http.write_json({ status = "error", data = output })
	end
end


-- Stop tunnel
function action_stop()

	-- Get the row id from url
	local url = luci.http.getenv("REQUEST_URI")
    local segments = url:split("/")
	local row_id = segments[#segments]

	-- Execute script
	local success, output = pcall(function()
		return io.popen(string.format(sc_stop_tunnel, row_id)):read()
	end)

	-- Write response
	if success then
		luci.http.prepare_content("application/json")
		luci.http.write_json({ status = "ok", data = output })
	else
		luci.http.prepare_content("application/json")
		luci.http.write_json({ status = "error", data = output })
	end
end


-- Status tunnel
function action_status()

	-- Get the row id from url
	local url = luci.http.getenv("REQUEST_URI")
    local segments = url:split("/")
	local row_id = segments[#segments]

	-- Execute script
	local success, output = pcall(function()
		return io.popen(string.format(sc_status_tunnel, row_id)):read()
	end)

	-- Write response
	if success then
		luci.http.prepare_content("application/json")
		luci.http.write_json({ status = "ok", data = output })
	else
		luci.http.prepare_content("application/json")
		luci.http.write_json({ status = "error", data = output })
	end
end


-- Export config
function action_export()

	row_ids = luci.http.formvalue("ids")
	luci.http.prepare_content("text/plain")
	luci.http.header("Content-Disposition", "attachment; filename=\"ipsec\"")
	luci.http.write("\n")

	-- Loop over row ids
	for i, row_id in pairs(luci.util.split(row_ids, ",")) do

		uci:foreach(config, "connections", function(s_conn)

			if s_conn[".name"] ~= row_id then
				return
			end
			-- Write connections section
			luci.http.write(string.format("config connections '%s'\n", row_id))
			for key, value in pairs(s_conn) do
				if string.sub(key, 1, 1) ~= "." then
					luci.http.write(string.format("\toption %s '%s'\n", key, value))
				end
			end
			luci.http.write("\n")
			-- Write local section
			luci.http.write(string.format("config local\n"))
			uci:foreach(config, "local", function(m_local)
				if m_local.parent == row_id then
					for key, value in pairs(m_local) do
						if string.sub(key, 1, 1) ~= "." then
							luci.http.write(string.format("\toption %s '%s'\n", key, value))
						end
					end
				end
			end)
			luci.http.write("\n")
			-- Write remote section
			luci.http.write(string.format("config remote\n"))
			uci:foreach(config, "remote", function(m_remote)
				if m_remote.parent == row_id then
					for key, value in pairs(m_remote) do
						if string.sub(key, 1, 1) ~= "." then
							luci.http.write(string.format("\toption %s '%s'\n", key, value))
						end
					end
				end
			end)
			luci.http.write("\n")
			-- Write children section
			luci.http.write(string.format("config children\n"))
			uci:foreach(config, "children", function(m_child)
				if m_child.parent == row_id then
					for key, value in pairs(m_child) do
						if string.sub(key, 1, 1) ~= "." then
							luci.http.write(string.format("\toption %s '%s'\n", key, value))
						end
					end
				end
			end)
			luci.http.write("\n")
		end)
	end
end
