import { Check, Fail } from "./index"

import {
  afterEach,
  describe,
  expect,
  test,
} from 'vitest'

afterEach(() => {
  Check.renameWith((name:string) => name)
})

const yell = (sample:object, object:{ [key: string]: unknown }) => {
  const r = Check.run(sample, object)
  if (!r.success) {
    throw new Check.CheckError(r.fail)
  }
}

describe("required", ()=>{
  interface I { p?:string }
  test("is the default", ()=>{
    const sample = Check.define({p:{v:""}})
    expect(() => {yell(sample, {}) }).toThrow("p: missing required property")
    yell(sample, {p:""})
  })
  test("explicitly required", ()=>{
    const sample = Check.define({p:{v:"", required:true}})
    expect(() => {yell(sample, {}) }).toThrow("p: missing required property")
    yell(sample, {p:""})
  })
  test("not required", ()=>{
    const sample = Check.define({p:{v:"" as string|undefined, required:false}})
    yell(sample, {p:""})
    yell(sample, {})
  })
  test("non-required fields are still validated if present", ()=>{
    const sample = Check.define({
      p:{v:0 as number|undefined, required:false, min:0}
    })
    expect(() => {yell(sample, {p:-1})}).toThrow("p: value of -1 < minimum value of 0")
  })
})

function newDate(year:number):Date {
  return new Date(Date.UTC(year, 1, 1, 0, 0, 0, 0))
}

describe("min", ()=>{
  test("number", ()=>{
    const sample = Check.define({v:{ v:10, min:10 }})
    expect(() => {yell(sample, {v:5}) }).toThrow("v: value of 5 < minimum value of 10")
    yell(sample, {v:10})
    yell(sample, {v:11})
    yell(sample, {v:110000})
  })
  test("BigInt", ()=>{
    const sample = Check.define({v:{ v:BigInt(10), min:10 }})
    expect(() => {yell(sample, {v:BigInt(5)}) }).toThrow("v: value of 5 < minimum value of 10")
    yell(sample, {v:BigInt(10)})
    yell(sample, {v:BigInt(11)})
    yell(sample, {v:BigInt(110000)})
  })
  test("Date", ()=>{
    const sample = Check.define({v:{ v:newDate(1970), min:10 }})
    expect(() => {yell(sample, {v:newDate(1969)}) }).toThrow("< minimum value of")
    yell(sample, {v:newDate(1970)})
    yell(sample, {v:newDate(2000)})
    yell(sample, {v:newDate(110000)})
  })
  test("string (length)", ()=>{
    const sample = Check.define({v:{ v:"1234567890", min:10 }})
    expect(() => {yell(sample, {v:"12345"}) }).toThrow("v: length of 5 < minimum length of 10")
    yell(sample, {v:"1234567890"})
    yell(sample, {v:"1234567890A"})
    yell(sample, {v:"1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ"})
  })
})

describe("max", ()=>{
  test("number", ()=>{
    const sample = Check.define({v:{ v:0, max:10 }})
    expect(() => {yell(sample, {v:50}) }).toThrow("v: value of 50 > maximum value of 10")
    yell(sample, {v:10})
    yell(sample, {v:9})
    yell(sample, {v:-110000})
  })
  test("BigInt", ()=>{
    const sample = Check.define({v:{ v:BigInt(10), max:BigInt(10) }})
    expect(() => {yell(sample, {v:BigInt(50)}) }).toThrow("v: value of 50 > maximum value of 10")
    yell(sample, {v:BigInt(10)})
    yell(sample, {v:BigInt(9)})
    yell(sample, {v:BigInt(-110000)})
  })
  test("Date", ()=>{
    const sample = Check.define({v:{ v:newDate(0), max:newDate(1970) }})
    expect(() => {yell(sample, {v:newDate(1971)}) }).toThrow("> maximum value of")
    yell(sample, {v:newDate(1969)})
    yell(sample, {v:newDate(1800)})
  })
  test("string (length)", ()=>{
    const sample = Check.define({v:{ v:"", max:3 }})
    expect(() => {yell(sample, {v:"12345"}) }).toThrow("v: length of 5 > maximum length of 3")
    yell(sample, {v:"123"})
    yell(sample, {v:"12"})
    yell(sample, {v:""})
  })
})

describe("allowed", ()=>{
  test("allowed", ()=>{
    const sample = Check.define({v:{ v:"a", allowed:["a","b","c"]}})
    expect(() => {yell(sample, {v:"d"}) }).toThrow("v: invalid value: d - valid values are: a,b,c")
    yell(sample, {v:"a"})
    yell(sample, {v:"b"})
    yell(sample, {v:"c"})
  })
})

test("regex", () => {
  const sample = Check.define({s:{ v:"abc", regex:/abc/}})
  expect(() => {yell(sample, {s:"a"})}).toThrow("s: invalid value: a - must match /abc/")
  expect(() => {yell(sample, {s:""})}).toThrow("s: invalid value:  - must match /abc/")
  yell(sample, {s:"abc"})
  yell(sample, {s:"123abc"})
  yell(sample, {s:"1abc1"})
})

describe("integer", () => {
  test("true by default", () => {
    const sample = Check.define({n:{v:0}})
    expect(() => {yell(sample, {n:3.1})}).toThrow("n: value of 3.1 is not a safe integer")
    expect(() => {yell(sample, {n:2**53})}).toThrow("n: value of 9007199254740992 is not a safe integer")
    yell(sample, {n:-1000})
    yell(sample, {n:2**53-1})
  })
  test("explicitly set to true", () => {
    const sample = Check.define({n:{v:0, integer:true}})
    expect(() => {yell(sample, {n:3.1})}).toThrow("n: value of 3.1 is not a safe integer")
    expect(() => {yell(sample, {n:2**53})}).toThrow("n: value of 9007199254740992 is not a safe integer")
    yell(sample, {n:-1000})
    yell(sample, {n:2**53-1})
  })
  test("false", () => {
    const sample = Check.define({n:{v:0, integer:false}})
    yell(sample, {n:-1000})
    yell(sample, {n:2**53-1})
    yell(sample, {n:2**53})
    yell(sample, {n:3.14})
  })
})

test("custom", ()=>{
  const sample = Check.define({
    v:{
      v:0,
      custom:(value:number)=>{
        if (value % 2 !== 0) {
          return new Fail("v", "EVEN", "must be even")
        }
      }
    }
  })
  expect(() => {yell(sample, {v:1}) }).toThrow("must be even")
  yell(sample, {v:0})
})

test("dates", () => {
  const sample = Check.define({ d:{ v:newDate(1970) }})
  yell(sample, {d:"2024-01-08T23:38:03"})
  expect(() => { yell(sample, {d:"foo"})}).toThrow("d: type mismatch, expected date but got string")
})

test("nested objects", () => {
  const sample2 = Check.define({ s:{v:"1", min:1 }})
  const sample1 = Check.define({ o:{v:sample2 }})
  const good = { o: { s: "2" } }
  const r = Check.run(sample1, good)
  if (r.success) {
    expect(r.result.o.s).toBe("2")
  } else {
    expect(r.success).toBe(true)
  }
  const bad = { o: { s: "" } }
  expect(() => { yell(sample1, bad) }).toThrow("o.s: length of 0 < minimum length of 1")
})

describe("nested arrays", () => {
  test("primitive elements", () => {
    const sample = Check.define({ a:{ v:[""] } })
    const good1 = { a:["1", "2", "3"] }
    yell(sample, good1)
    const good2 = { a:[] }
    yell(sample, good2)
    const bad = { a:[1, 2, 3] }
    expect(() => { yell(sample, bad)}).toThrow("a[0]: type mismatch, expected string but got number")
  })
  test("object elements", () => {
    const sampleElement = Check.define({ n: { v:1 }})
    const sample = Check.define({ a:{ v:[sampleElement] }})
    const good1 = { a:[] }
    yell(sample, good1)
    const good2 = { a:[{ n:11 }, { n:22 }, { n:33 }]}
    yell(sample, good2)
    const bad = { a:[1,2,3] }
    expect(() => { yell(sample, bad)}).toThrow("a[0]: type mismatch, expected object but got number")
  })
})

test("rename", () => {
  Check.renameWith((name:string) => name.replaceAll("_", ""))
  const sample = Check.define({
    nounderscores: { v:"" },
  })
  const r = Check.run(sample, { no_underscores: "ABC" })
  if (r.success) {
    expect(r.result.nounderscores).toBe("ABC")
  } else {
    console.log(r.fail)
    expect(r.fail).toBeUndefined()
  }
})


test("throws error if never defined", ()=>{
  expect(() => {Check.run({}, {x:5})}).toThrow("no checks defined")
})

test("runOne", () => {
  const sample = Check.define({ n:{ v:10, min:0 }})
  const obj = { n:0 }
  Check.copy(sample, obj)
  const fails = Check.runOne(obj, "n", -1)
  expect(fails).toHaveLength(1)
  expect(fails[0]?.prefix).toBe("n")
  expect(fails[0]?.code).toBe("MIN")
  expect(fails[0]?.message).toBe("value of -1 < minimum value of 0")
})

test("get", () => {
  const sample = Check.define({ n:{ v:10, min:0 }})
  const obj = { n:0 }
  Check.copy(sample, obj)
  const schema = Check.get(obj)
  expect(schema).toBeDefined()
  expect(schema!.n.v).toBe(10)
  expect(schema!.n.min).toBe(0)  
})
