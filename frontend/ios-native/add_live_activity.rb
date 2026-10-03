# Adds the Dynamic Island / Live Activity support to the Capacitor iOS
# project that `npx cap add ios` generates (it is regenerated on every CI
# build, so nothing here is committed as an Xcode project):
#
#   * copies the app-side Swift (plugin, view controller, shared attributes)
#     into the App target
#   * creates the ACWidget widget-extension target and embeds it in the app
#   * raises the deployment target to iOS 16.2 (Live Activities)
#
# Run from frontend/:  ruby ios-native/add_live_activity.rb
require "xcodeproj"
require "fileutils"

src = __dir__
frontend = File.expand_path("..", src)
ios = File.join(frontend, "ios", "App")
project_path = File.join(ios, "App.xcodeproj")

project = Xcodeproj::Project.open(project_path)
app = project.targets.find { |t| t.name == "App" } or abort("App target not found")
PBXGroup = Xcodeproj::Project::Object::PBXGroup
app_group = project.main_group.children.find { |g| g.is_a?(PBXGroup) && (g.path == "App" || g.name == "App") } or
  abort("App group not found: #{project.main_group.children.map(&:display_name).join(', ')}")

# ---- app-side Swift ------------------------------------------------------
app_files = %w[ACActivityAttributes.swift LiveActivityPlugin.swift MainViewController.swift]
app_refs = {}
app_files.each do |f|
  FileUtils.cp(File.join(src, "App", f), File.join(ios, "App", f))
  ref = app_group.files.find { |r| r.path == f } || app_group.new_reference(f)
  app_refs[f] = ref
  app.source_build_phase.add_file_reference(ref, true)
end

# ---- widget extension ----------------------------------------------------
widget_dir = File.join(ios, "ACWidget")
FileUtils.mkdir_p(widget_dir)
%w[ACWidgetBundle.swift ACLiveActivity.swift Info.plist].each do |f|
  FileUtils.cp(File.join(src, "Widget", f), File.join(widget_dir, f))
end

widget = project.targets.find { |t| t.name == "ACWidget" } ||
  project.new_target(:app_extension, "ACWidget", :ios, "16.2", nil, :swift)

widget_group = project.main_group.children.find { |g| g.is_a?(PBXGroup) && g.path == "ACWidget" } ||
  project.main_group.new_group("ACWidget", "ACWidget")
%w[ACWidgetBundle.swift ACLiveActivity.swift].each do |f|
  ref = widget_group.files.find { |r| r.path == f } || widget_group.new_reference(f)
  widget.source_build_phase.add_file_reference(ref, true)
end
widget_group.new_reference("Info.plist") unless widget_group.files.any? { |r| r.path == "Info.plist" }
# The shared attributes struct is compiled into the widget as well.
widget.source_build_phase.add_file_reference(app_refs["ACActivityAttributes.swift"], true)

widget.build_configurations.each do |config|
  s = config.build_settings
  s["PRODUCT_BUNDLE_IDENTIFIER"] = "com.omar.accontroller.ACWidget"
  s["PRODUCT_NAME"] = "$(TARGET_NAME)"
  s["INFOPLIST_FILE"] = "ACWidget/Info.plist"
  s["GENERATE_INFOPLIST_FILE"] = "NO"
  s["SWIFT_VERSION"] = "5.0"
  s["TARGETED_DEVICE_FAMILY"] = "1,2"
  s["IPHONEOS_DEPLOYMENT_TARGET"] = "16.2"
  s["MARKETING_VERSION"] = "1.0"
  s["CURRENT_PROJECT_VERSION"] = "1"
  s["SKIP_INSTALL"] = "YES"
  s["APPLICATION_EXTENSION_API_ONLY"] = "YES"
  s["LD_RUNPATH_SEARCH_PATHS"] = ["$(inherited)", "@executable_path/Frameworks", "@executable_path/../../Frameworks"]
  s["CODE_SIGN_STYLE"] = "Automatic"
end

# ---- embed the extension in the app --------------------------------------
app.add_dependency(widget) unless app.dependencies.any? { |d| d.target == widget }
embed = app.copy_files_build_phases.find { |p| p.name == "Embed Foundation Extensions" } ||
  app.new_copy_files_build_phase("Embed Foundation Extensions")
embed.symbol_dst_subfolder_spec = :plug_ins
unless embed.files_references.include?(widget.product_reference)
  build_file = embed.add_file_reference(widget.product_reference, true)
  build_file.settings = { "ATTRIBUTES" => ["RemoveHeadersOnCopy"] }
end

# ---- app settings --------------------------------------------------------
app.build_configurations.each do |config|
  config.build_settings["IPHONEOS_DEPLOYMENT_TARGET"] = "16.2"
  config.build_settings["MARKETING_VERSION"] = "1.0"
  config.build_settings["CURRENT_PROJECT_VERSION"] = "1"
end

project.save
puts "Live Activity: added #{app_files.join(', ')} to App, created and embedded ACWidget"
