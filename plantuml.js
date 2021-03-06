
let isSwiftClass = 'source.lang.swift.decl.class'
let isSwiftStruct = 'source.lang.swift.decl.struct'
let isSwiftEnum = 'source.lang.swift.decl.enum'
let isSwiftExtension = 'source.lang.swift.decl.extension'
let isSwiftProtocol = 'source.lang.swift.decl.protocol'
let isPublic = 'source.lang.swift.accessibility.public'
let isPrivate = 'source.lang.swift.accessibility.private'
let isInternal = 'source.lang.swift.accessibility.internal'
let isStaticMethod = 'source.lang.swift.decl.function.method.static'
let isStaticVariable = 'source.lang.swift.decl.var.static'
let isNull = null


let linkTypeInheritance = '-u-|>' 
let linkTypeRealize = '.u.|>' 
let linkTypeDependency = '<..' 
let linkTypeAssociation = '-[dotted]->' 
let linkTypeAggregation = '--o' 
let linkTypeComposition = '--*' 
let linkTypeGeneric = '--'


var STR2REPLACE = 'STR2REPLACE'

var plantumlTemplate = `
@startuml
' STYLE START
hide empty members
skinparam shadowing false
' STYLE END
`+STR2REPLACE+`
@enduml
`

let styleStruct = `<< (S, SkyBlue) struct >>`
let styleExtn = `<< (E,orchid) extension >>`
let styleEnum = `<< (E,LightSteelBlue) enum >>`
let styleProtocol = `<< (P,GoldenRod) protocol >>`

function uniqName(item, index, relationship){
    var newName = item.name
    var linkTypeKey = item.name + "LinkType"

    if (uniqElementNames.includes(item.name)) {
        newName += `${index}`
        if (item.kind == isSwiftExtension) {
            var connect = `${item.name} ${linkTypeDependency} ${newName} : ${relationship}`
            extnConnections.push(connect)
        }
    }
    else if(item.kind == isSwiftExtension) {
        newName += `${index}`
        var connect = `${item.name} ${linkTypeDependency} ${newName} : ${relationship}`
        extnConnections.push(connect)
    }
    else {
        if(item.kind == isSwiftClass) {
            uniqElementNames.push(item.name)
        }
        uniqElementAndTypes[item.name] =  relationship 

        if (relationship == "inherits"){
            uniqElementAndTypes[linkTypeKey] = linkTypeInheritance
        }
        else if (relationship == "confirms to") {
            uniqElementAndTypes[linkTypeKey] = linkTypeRealize
        }
        else if (relationship == "ext") {
            uniqElementAndTypes[linkTypeKey] = linkTypeDependency
        }
        else if (relationship == "association") {
            uniqElementAndTypes[linkTypeKey] = linkTypeAssociation
        }
        else if (relationship == "aggregation") {
            uniqElementAndTypes[linkTypeKey] = linkTypeAggregation
        }
        else if (relationship == "composition") {
            uniqElementAndTypes[linkTypeKey] = linkTypeComposition
        }
        else {
            uniqElementAndTypes[linkTypeKey] = linkTypeGeneric
        }
        
    }
    return newName
}


var srcjs = require('./out.json')
// console.log(`total no. of elements:` + srcjs.length)

var msg = ''
var i = 0

var uniqElementNames = []
var uniqElementAndTypes = {}

var connections = []
var extnConnections = []
var itemsPendingForConnections = []
var dependencyLinks = []
var dependecyLinksMap = {}

srcjs.forEach(function (item){
    if (item && item.kind == isSwiftProtocol) {
        process(item)
    }
}
);

srcjs.forEach(function (item){
    if (item && item.kind == isSwiftClass) {
        process(item)
    }
}
);

srcjs.forEach(function (item){
    if (item && item.kind == isSwiftStruct) {
        process(item)
    }
}
);

srcjs.forEach(function (item){
    if (item && item.kind == isSwiftEnum) {
        process(item)
    }
}
);

srcjs.forEach(function (item){
    if (item && item.kind == isSwiftExtension) {
        process(item)
    }
}
);

//always make connections in the very end. Else superclasses, if parsed later will not connect properly
makePendingConnections()


function process(item){
    var strItem = ''
    if (item && item.kind == isSwiftClass && item.name){
        
        strItem += 'class "' + item.name + '" as ' + uniqName(item, i, "inherits") + ' {\n'

    }
    else if (item && item.kind == isSwiftStruct && item.name){
        strItem += 'class "' + item.name + '" as ' + uniqName(item, i, "inherits") + ' ' + styleStruct + ' {\n'

    }
    else if (item && item.kind == isSwiftExtension && item.name){
            strItem += 'class "' + item.name + '" as ' + uniqName(item, i, "ext") + ' ' + styleExtn + ' {\n'

    }
    else if (item && item.kind == isSwiftEnum && item.name) {
        strItem += 'class "' + item.name + '" as ' + uniqName(item, i, "") + ' ' + styleEnum + ' {\n'

    }
    else if (item && item.kind == isSwiftProtocol && item.name) {
        strItem += 'class "' + item.name + '" as ' + uniqName(item, i, "confirms to") + ' ' + styleProtocol + ' {\n'

    }

    var methods = ''
    
    if (item.members && item.members.length>0){
        
        item.members.forEach(function (method) {
            var msig = '  '
            msig += (method.kind == isStaticMethod || method.kind == isStaticVariable)? '{static} ': ''
            msig += (method.scope == isPublic)? '+': (method.scope == isInternal)? '~': '-'
            msig += method.name

            if (method.type == isNull) {
                msig += '\n'
            }
            else {
                msig += ': ' + method.type + '\n'

                let type = method.type.replace("?","").replace("!","")
                if (type.includes(":") == false) {
                    if (!dependecyLinksMap[item.name]) 
                        dependecyLinksMap[item.name] = [];
                    
                    dependecyLinksMap[item.name].push(type);
                }
            }
            methods += msig

            //Add parameter types
            method.paramTypes.forEach(function (paramType) {
                let type = paramType.replace("?","").replace("!","")
                if (type.includes(":") == false) {
                    if (!dependecyLinksMap[item.name]) 
                        dependecyLinksMap[item.name] = [];
                    
                    dependecyLinksMap[item.name].push(type);
                }
            })
        })
    }

    if (item.inherits && item.inherits.length > 0) {
        itemsPendingForConnections.push(item)
    }

    strItem += methods+ '\n}\n'
    msg += strItem
    i++
}

function makePendingConnections() {
    itemsPendingForConnections.forEach(function(item) {
        item.inherits.forEach(function (obj) {

            var linkTo = obj["key.name"]
            var namedConnection = (uniqElementAndTypes[linkTo]) ? ": " + uniqElementAndTypes[linkTo] : ""
            var linkTypeKey = item.name + "LinkType"
            
            if (uniqElementAndTypes[linkTo] == "confirms to"){
                linkTypeKey = linkTo + "LinkType"
            }

            var linkType = (uniqElementAndTypes[linkTypeKey]) ? uniqElementAndTypes[linkTypeKey] : "--"
        
            var connect = `${item.name} ${linkType} ${linkTo} ${namedConnection}`
            connections.push(connect)
        })
    })

    for (let item in dependecyLinksMap) {
        dependecyLinksMap[item].forEach(function(type) {
            let dependencyLink = `${item} ${linkTypeAssociation} ${type} : uses`

            if (item != type && (type in uniqElementAndTypes) && connections.includes(dependencyLink) == false) {
                connections.push(dependencyLink)
            }
        })
    }

}

var out = plantumlTemplate.replace(STR2REPLACE, msg + "\n" + connections.join("\n") + "\n" + extnConnections.join("\n"))

console.log(out)
